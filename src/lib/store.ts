import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ESCROW,
  type AppNotification,
  type Assignment,
  type Course,
  type HelpRequest,
  type ID,
  type LiveInfo,
  type LiveKind,
  type NotificationKind,
  type Post,
  type Profile,
  type Rating,
  type Report,
  type ReportReason,
  type ReportTarget,
  type Submission,
  type Transaction,
  type TxCategory,
  type User,
} from "./types";
import { emptyProfile, makeSeed } from "./seed";
import { normalize, uid } from "./utils";
import { currentSlot, ymd } from "./time";
import { LIMITS, MOD, checkLiveText, checkText, checkUrl } from "./moderation";

export const LIVE_KINDS: Record<LiveKind, string> = {
  cancel: "休講",
  room: "教室変更",
  late: "開始が遅れる",
  handout: "配布物・連絡",
  other: "その他",
};

/** 失敗したら理由の文字列、成功したら null */
export type Err = string | null;

interface Data {
  users: User[];
  courses: Course[];
  enrollments: Record<ID, ID[]>;
  assignments: Assignment[];
  submissions: Submission[];
  posts: Post[];
  live: LiveInfo[];
  tx: Transaction[];
  requests: HelpRequest[];
  notifications: AppNotification[];
  reports: Report[];
  blocks: Record<ID, ID[]>;
  ratings: Rating[];
}

interface State extends Data {
  me: ID | null;
  /** デモ用：時計をずらす（分） */
  clockOffsetMin: number;
  /** ブラウザ通知を出した通知 ID（二重に出さないため） */
  pushed: ID[];

  now(): Date;
  loginAs(id: ID): void;
  logout(): void;
  register(input: { name: string; studentId: string; avatar: string; lineId: string }): Err;
  updateMe(patch: Partial<Pick<User, "name" | "avatar">>): Err;
  updateProfile(patch: Partial<Profile>): Err;
  setClockOffset(min: number): void;
  resetDemo(): void;

  importTimetable(rows: { name: string; teacher: string; day: number; period: number; room: string }[]): {
    created: number;
    enrolled: number;
  };
  updateCourse(id: ID, patch: Partial<Pick<Course, "syllabusUrl">>): Err;
  setEnrolled(courseId: ID, on: boolean): void;

  addAssignment(a: Omit<Assignment, "id" | "createdBy" | "createdAt">): { id: ID } | { error: string };
  deleteAssignment(id: ID): Err;
  submit(assignmentId: ID, detail?: Partial<Omit<Submission, "assignmentId" | "userId" | "submittedAt">>): Err;
  unsubmit(assignmentId: ID): void;

  addPost(courseId: ID, text: string): Err;
  deletePost(id: ID): void;
  addLive(courseId: ID, kind: LiveKind, text: string): Err;
  deleteLive(id: ID): void;
  voteLive(id: ID, vote: "confirm" | "deny"): Err;

  send(to: ID, amount: number, memo: string): Err;

  addRequest(r: Pick<HelpRequest, "kind" | "title" | "detail" | "courseId" | "assignmentId" | "price" | "listUntil" | "dueAt">): Err;
  cancelRequest(id: ID): Err;
  acceptRequest(id: ID): Err;
  withdrawRequest(id: ID): Err;
  reportDone(id: ID): Err;
  confirmDone(id: ID): Err;
  disputeRequest(id: ID): Err;
  cancelNoShow(id: ID): Err;
  rate(requestId: ID, good: boolean): Err;

  report(targetType: ReportTarget, targetId: ID, targetOwner: ID, reason: ReportReason): Err;
  toggleBlock(userId: ID): void;

  markRead(id: ID): void;
  markAllRead(): void;
  markPushed(ids: ID[]): void;
  runChecks(): void;
}

function seedData(): Data {
  const s = makeSeed(Date.now());
  return { ...s, notifications: [] };
}

const DAY = 86400_000;

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const nowIso = () => get().now().toISOString();
      const nowMs = () => get().now().getTime();

      /** 通知を追加する。key が同じ通知は一度しか作らない */
      const notify = (
        userId: ID,
        kind: NotificationKind,
        title: string,
        body: string,
        opts: { link?: string; key?: string; partnerId?: ID } = {},
      ) => {
        const key = opts.key ? `${userId}:${opts.key}` : null;
        if (key && get().notifications.some((n) => n.key === key)) return;
        const n: AppNotification = {
          id: uid(),
          userId,
          kind,
          title,
          body,
          link: opts.link ?? null,
          createdAt: nowIso(),
          read: false,
          key,
          partnerId: opts.partnerId ?? null,
        };
        set((s) => ({ notifications: [n, ...s.notifications] }));
      };
      const meId = () => {
        const id = get().me;
        if (!id) throw new Error("ログインしていません");
        return id;
      };
      const nameOf = (id: ID) => get().users.find((u) => u.id === id)?.name ?? "だれか";
      const enrolledUsers = (courseId: ID) => membersOf(get(), courseId);
      const isEnrolled = (userId: ID, courseId: ID) => (get().enrollments[userId] ?? []).includes(courseId);
      const moveMoney = (from: Transaction["from"], to: ID, amount: number, memo: string, category: TxCategory, requestId?: ID) =>
        set((s) => ({ tx: [...s.tx, { id: uid(), from, to, amount, memo, category, requestId, createdAt: nowIso() }] }));
      const patchRequest = (id: ID, patch: Partial<HelpRequest>) =>
        set((s) => ({ requests: s.requests.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      const restricted = (): Err =>
        isRestricted(get(), meId()) ? "通報が多く集まったため、投稿・依頼・送金が制限されています" : null;
      const within = (iso: string, ms: number) => nowMs() - new Date(iso).getTime() < ms;

      /** 誰も払わなかった報酬を依頼者に返す */
      const refund = (r: HelpRequest, memo: string) => moveMoney(ESCROW, r.userId, r.price, memo, "refund", r.id);

      return {
        ...seedData(),
        me: null,
        clockOffsetMin: 0,
        pushed: [],

        now: () => new Date(Date.now() + get().clockOffsetMin * 60_000),

        loginAs: (id) => set({ me: id }),
        logout: () => set({ me: null }),

        register: ({ name, studentId, avatar, lineId }) => {
          const c = checkText(name);
          if (!c.ok) return `名前に使えない言葉が含まれています：${c.reason}`;
          if (get().users.some((u) => u.studentId === studentId)) return "この学籍番号はすでに登録されています";
          const id = uid();
          const user: User = {
            id,
            name,
            nameChangedAt: null,
            studentId,
            avatar,
            profile: { ...emptyProfile(), lineId },
            createdAt: nowIso(),
          };
          set((s) => ({ users: [...s.users, user], enrollments: { ...s.enrollments, [id]: [] }, me: id }));
          moveMoney("system", id, 1000, "口座開設ボーナス", "bonus");
          notify(id, "system", "口座を開設しました", "学内通貨ぺいの口座ができました。開設ボーナス 1,000 ぺいを入金しました。", {
            link: "/wallet",
          });
          return null;
        },

        updateMe: (patch) => {
          const me = meId();
          const user = get().users.find((u) => u.id === me)!;
          const next = { ...patch };
          if (next.name !== undefined && next.name !== user.name) {
            const c = checkText(next.name);
            if (!c.ok) return `名前に使えない言葉が含まれています：${c.reason}`;
            // なりすまし対策：名前は30日に1回しか変えられない
            if (user.nameChangedAt && within(user.nameChangedAt, MOD.nameChangeDays * DAY)) {
              return `名前の変更は ${MOD.nameChangeDays} 日に1回までです`;
            }
            Object.assign(next, { nameChangedAt: nowIso() });
          }
          set((s) => ({ users: s.users.map((u) => (u.id === me ? { ...u, ...next } : u)) }));
          return null;
        },
        updateProfile: (patch) => {
          const me = meId();
          const texts = Object.entries(patch)
            .filter(([k, v]) => typeof v === "string" && k !== "birthday" && k !== "cardTheme" && k !== "lineId")
            .map(([, v]) => v as string);
          if (patch.life) texts.push(...patch.life.map((e) => e.text));
          const c = checkText(...texts);
          if (!c.ok) return c.reason;
          if (patch.lineId && !/^[\w.-]{0,30}$/.test(patch.lineId)) return "LINE ID は半角英数字と . _ - だけで入力してください";
          set((s) => ({
            users: s.users.map((u) => (u.id === me ? { ...u, profile: { ...u.profile, ...patch } } : u)),
          }));
          return null;
        },
        setClockOffset: (min) => set({ clockOffsetMin: min }),
        resetDemo: () => set({ ...seedData(), me: null, clockOffsetMin: 0, pushed: [] }),

        importTimetable: (rows) => {
          const me = meId();
          let created = 0;
          let enrolled = 0;
          const courses = [...get().courses];
          const mine = new Set(get().enrollments[me] ?? []);
          for (const r of rows) {
            // 授業名・曜日・時限が一致すれば同じ授業とみなす
            let course = courses.find(
              (c) => normalize(c.name) === normalize(r.name) && c.day === r.day && c.period === r.period,
            );
            if (!course) {
              course = { id: uid(), name: r.name.trim().slice(0, 60), teacher: r.teacher.trim().slice(0, 40), day: r.day, period: r.period, room: r.room.trim().slice(0, 40), syllabusUrl: "" };
              courses.push(course);
              created++;
            }
            if (!mine.has(course.id)) {
              mine.add(course.id);
              enrolled++;
            }
          }
          set((s) => ({ courses, enrollments: { ...s.enrollments, [me]: [...mine] } }));
          return { created, enrolled };
        },
        updateCourse: (id, patch) => {
          const me = meId();
          if (!isEnrolled(me, id)) return "履修している授業だけ編集できます";
          if (patch.syllabusUrl) {
            const c = checkUrl(patch.syllabusUrl);
            if (!c.ok) return c.reason;
          }
          set((s) => ({ courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
          return null;
        },
        setEnrolled: (courseId, on) => {
          const me = meId();
          set((s) => {
            const cur = s.enrollments[me] ?? [];
            const next = on ? [...new Set([...cur, courseId])] : cur.filter((c) => c !== courseId);
            return { enrollments: { ...s.enrollments, [me]: next } };
          });
        },

        addAssignment: (a) => {
          const me = meId();
          const r = restricted();
          if (r) return { error: r };
          if (!isEnrolled(me, a.courseId)) return { error: "履修している授業にだけ課題を登録できます" };
          if (new Date(a.deadline).getTime() <= nowMs()) return { error: "締め切りが過ぎた課題は登録できません" };
          const c = checkText(a.title, a.materials);
          if (!c.ok) return { error: c.reason };
          if (get().assignments.filter((x) => x.createdBy === me && within(x.createdAt, DAY)).length >= LIMITS.assignmentsPerDay) {
            return { error: `課題の登録は1日 ${LIMITS.assignmentsPerDay} 件までです` };
          }
          const id = uid();
          set((s) => ({ assignments: [...s.assignments, { ...a, id, createdBy: me, createdAt: nowIso() }] }));
          return { id };
        },
        deleteAssignment: (id) => {
          const me = meId();
          const a = get().assignments.find((x) => x.id === id);
          if (!a || a.createdBy !== me) return "自分が登録した課題だけ削除できます";
          if (get().submissions.some((x) => x.assignmentId === id && x.userId !== me)) return "ほかの人が提出済みにしているので削除できません。間違いなら通報してください";
          set((s) => ({ assignments: s.assignments.filter((x) => x.id !== id) }));
          return null;
        },
        submit: (assignmentId, detail = {}) => {
          const me = meId();
          const c = checkText(detail.caution ?? "");
          if (!c.ok) return c.reason;
          const prev = get().submissions.find((x) => x.assignmentId === assignmentId && x.userId === me);
          const next: Submission = {
            caution: "",
            minutes: null,
            artifactText: "",
            artifactFile: null,
            ...prev,
            ...detail,
            assignmentId,
            userId: me,
            submittedAt: prev?.submittedAt ?? nowIso(),
          };
          set((s) => ({
            submissions: [...s.submissions.filter((x) => !(x.assignmentId === assignmentId && x.userId === me)), next],
          }));
          return null;
        },
        unsubmit: (assignmentId) => {
          const me = meId();
          set((s) => ({ submissions: s.submissions.filter((x) => !(x.assignmentId === assignmentId && x.userId === me)) }));
        },

        addPost: (courseId, text) => {
          const me = meId();
          const r = restricted();
          if (r) return r;
          if (!isEnrolled(me, courseId)) return "履修している授業にだけ書き込めます";
          if (text.length > LIMITS.postLength) return `${LIMITS.postLength} 文字までです`;
          const c = checkText(text);
          if (!c.ok) return c.reason;
          const mine = get().posts.filter((p) => p.userId === me);
          if (mine.filter((p) => within(p.createdAt, 60_000)).length >= LIMITS.postsPerMinute) return "連続で書き込みすぎです。少し待ってください";
          if (mine.filter((p) => within(p.createdAt, DAY)).length >= LIMITS.postsPerDay) return `書き込みは1日 ${LIMITS.postsPerDay} 件までです`;
          const last = mine.at(-1);
          if (last && last.courseId === courseId && normalize(last.text) === normalize(text)) return "同じ内容を続けて書き込むことはできません";
          set((s) => ({ posts: [...s.posts, { id: uid(), courseId, userId: me, text, createdAt: nowIso() }] }));
          return null;
        },
        deletePost: (id) => {
          const me = meId();
          set((s) => ({ posts: s.posts.filter((p) => !(p.id === id && p.userId === me)) }));
        },

        addLive: (courseId, kind, text) => {
          const me = meId();
          const r = restricted();
          if (r) return r;
          if (liveCourse(get(), get().now())?.id !== courseId) return "授業時間中だけ投稿できます";
          const c = checkLiveText(text);
          if (!c.ok) return c.reason;
          const today = ymd(get().now());
          if (get().live.filter((l) => l.userId === me && l.courseId === courseId && l.date === today).length >= LIVE_LIMIT()) {
            return `この授業への連絡は1日 ${LIVE_LIMIT()} 件までです`;
          }
          const info: LiveInfo = {
            id: uid(),
            courseId,
            date: today,
            kind,
            text,
            userId: me,
            createdAt: nowIso(),
            confirms: [me],
            denies: [],
            notified: false,
          };
          set((s) => ({ live: [...s.live, info] }));
          return null;
        },
        deleteLive: (id) => {
          const me = meId();
          set((s) => ({ live: s.live.filter((l) => !(l.id === id && l.userId === me)) }));
        },
        voteLive: (id, vote) => {
          const me = meId();
          const l = get().live.find((x) => x.id === id);
          if (!l) return "連絡が見つかりません";
          if (l.userId === me) return "自分の連絡には投票できません";
          if (!isEnrolled(me, l.courseId)) return "履修している人だけ投票できます";
          const confirms = l.confirms.filter((u) => u !== me);
          const denies = l.denies.filter((u) => u !== me);
          // 同じボタンをもう一度押したら取り消し
          if (vote === "confirm" && !l.confirms.includes(me)) confirms.push(me);
          if (vote === "deny" && !l.denies.includes(me)) denies.push(me);
          const next = { ...l, confirms, denies };
          // 投稿者以外にも確認した人がいて、沈んでいなければ、ここで初めて履修者全員に通知する
          const shouldNotify = !l.notified && confirms.length >= MOD.notifyLiveAfterConfirms && !isLiveSunk(next);
          if (shouldNotify) next.notified = true;
          set((s) => ({ live: s.live.map((x) => (x.id === id ? next : x)) }));
          if (shouldNotify) {
            const course = get().courses.find((c) => c.id === l.courseId)!;
            for (const u of enrolledUsers(l.courseId)) {
              if (confirms.includes(u) || isBlocked(get(), u, l.userId)) continue;
              notify(u, "live", `${course.name}：${LIVE_KINDS[l.kind]}`, `${l.text}（${confirms.length}人が確認）`, {
                link: `/course/${l.courseId}`,
                key: `live:${l.id}`,
              });
            }
          }
          return null;
        },

        send: (to, amount, memo) => {
          const me = meId();
          const r = restricted();
          if (r) return r;
          if (to === me) return "自分には送金できません";
          if (isBlocked(get(), me, to)) return "ブロックしている（されている）相手には送金できません";
          if (!Number.isInteger(amount) || amount <= 0) return "金額は 1 以上の整数で入力してください";
          if (balanceOf(get().tx, me) < amount) return "残高が足りません";
          const c = checkText(memo);
          if (!c.ok) return c.reason;
          const today = get().tx.filter((t) => t.from === me && t.category === "transfer" && within(t.createdAt, DAY));
          if (today.length >= LIMITS.sendsPerDay) return `送金は1日 ${LIMITS.sendsPerDay} 回までです`;
          if (today.reduce((a, t) => a + t.amount, 0) + amount > LIMITS.sendAmountPerDay) {
            return `送金は1日 ${LIMITS.sendAmountPerDay.toLocaleString()} ぺいまでです`;
          }
          moveMoney(me, to, amount, memo, "transfer");
          notify(to, "money", `${nameOf(me)}さんから ${amount.toLocaleString()} ぺい`, memo || "送金がありました", {
            link: "/wallet",
            partnerId: me,
          });
          return null;
        },

        // ---- 依頼：報酬は投稿した時点で預かり、完了したら引き受けた人へ ----
        addRequest: (input) => {
          const me = meId();
          const r = restricted();
          if (r) return r;
          const c = checkText(input.title, input.detail);
          if (!c.ok) return c.reason;
          if (!Number.isInteger(input.price) || input.price <= 0) return "価格は 1 ぺい以上の整数にしてください";
          if (input.price > balanceOf(get().tx, me)) return "残高を超える価格は設定できません（報酬は投稿時に預かります）";
          if (new Date(input.dueAt).getTime() <= nowMs()) return "希望期限は今より後にしてください";
          if (get().requests.filter((x) => x.userId === me && x.status === "open").length >= LIMITS.openRequests) {
            return `募集中の依頼は ${LIMITS.openRequests} 件までです`;
          }
          const id = uid();
          set((s) => ({
            requests: [
              ...s.requests,
              { ...input, id, userId: me, status: "open", acceptedBy: null, acceptedAt: null, reportedAt: null, noShow: false, createdAt: nowIso() },
            ],
          }));
          moveMoney(me, ESCROW, input.price, `依頼の報酬を預けました：${input.title}`, "escrow", id);
          return null;
        },
        cancelRequest: (id) => {
          const me = meId();
          const r = get().requests.find((x) => x.id === id);
          if (!r || r.userId !== me || r.status !== "open") return "取り下げられるのは、まだ誰も引き受けていない自分の依頼だけです";
          patchRequest(id, { status: "cancelled" });
          refund(r, `依頼を取り下げたので返金：${r.title}`);
          return null;
        },
        acceptRequest: (id) => {
          const me = meId();
          const rr = restricted();
          if (rr) return rr;
          const r = get().requests.find((x) => x.id === id);
          if (!r || r.status !== "open") return "この依頼はもう募集していません";
          if (r.userId === me) return "自分の依頼は引き受けられません";
          if (new Date(r.listUntil).getTime() <= nowMs()) return "掲載期限が過ぎています";
          if (isBlocked(get(), me, r.userId)) return "ブロックしている（されている）相手の依頼は引き受けられません";
          const active = get().requests.filter((x) => x.acceptedBy === me && (x.status === "accepted" || x.status === "reported"));
          if (active.length >= LIMITS.acceptedAtOnce) return `同時に引き受けられる依頼は ${LIMITS.acceptedAtOnce} 件までです`;
          patchRequest(id, { status: "accepted", acceptedBy: me, acceptedAt: nowIso() });
          // 確定したらお互いの受信ボックスに相手の LINE 追加・送金への導線を出す
          notify(r.userId, "accepted", `${nameOf(me)}さんが依頼を引き受けました`, `${r.title}\nLINE で連絡を取り合いましょう。報酬は預かっているので、終わったら「完了を確認」してください。`, {
            link: `/board/${id}`,
            partnerId: me,
            key: `accepted:${id}:${me}`,
          });
          notify(me, "accepted", `${nameOf(r.userId)}さんの依頼を引き受けました`, `${r.title}\nLINE で連絡を取り合いましょう。終わったら「完了を報告」してください。`, {
            link: `/board/${id}`,
            partnerId: r.userId,
            key: `accepted:${id}:${me}`,
          });
          return null;
        },
        withdrawRequest: (id) => {
          const me = meId();
          const r = get().requests.find((x) => x.id === id);
          if (!r || r.acceptedBy !== me || r.status !== "accepted") return "辞退できない状態です";
          const listUntil = new Date(Math.max(new Date(r.listUntil).getTime(), nowMs() + 6 * 3600_000)).toISOString();
          patchRequest(id, { status: "open", acceptedBy: null, acceptedAt: null, listUntil });
          notify(r.userId, "board", `${nameOf(me)}さんが依頼を辞退しました`, `${r.title}\nもう一度募集中に戻しました。`, { link: `/board/${id}` });
          return null;
        },
        reportDone: (id) => {
          const me = meId();
          const r = get().requests.find((x) => x.id === id);
          if (!r || r.acceptedBy !== me || r.status !== "accepted") return "完了を報告できない状態です";
          patchRequest(id, { status: "reported", reportedAt: nowIso() });
          notify(r.userId, "board", `${nameOf(me)}さんから完了の報告が届きました`, `${r.title}\n内容を確認して「完了を確認」してください。${MOD.autoReleaseHours}時間何もしないと、自動で報酬が支払われます。`, {
            link: `/board/${id}`,
            partnerId: me,
          });
          return null;
        },
        confirmDone: (id) => {
          const me = meId();
          const r = get().requests.find((x) => x.id === id);
          if (!r || r.userId !== me || !r.acceptedBy || (r.status !== "accepted" && r.status !== "reported" && r.status !== "dispute")) {
            return "完了にできない状態です";
          }
          patchRequest(id, { status: "done" });
          moveMoney(ESCROW, r.acceptedBy, r.price, `依頼の報酬：${r.title}`, "reward", id);
          notify(r.acceptedBy, "money", `報酬 ${r.price.toLocaleString()} ぺいを受け取りました`, r.title, { link: `/board/${id}`, partnerId: me });
          return null;
        },
        disputeRequest: (id) => {
          const me = meId();
          const r = get().requests.find((x) => x.id === id);
          if (!r || r.userId !== me || r.status !== "reported") return "問題を報告できない状態です";
          patchRequest(id, { status: "dispute" });
          notify(r.acceptedBy!, "moderation", "依頼者から問題が報告されました", `${r.title}\n報酬は預かったままです。話し合って解決したら、依頼者が「完了を確認」すると支払われます。`, {
            link: `/board/${id}`,
            partnerId: me,
          });
          return null;
        },
        cancelNoShow: (id) => {
          const me = meId();
          const r = get().requests.find((x) => x.id === id);
          if (!r || r.userId !== me || r.status !== "accepted" || !r.acceptedBy) return "取り消せない状態です";
          if (new Date(r.dueAt).getTime() > nowMs()) return "希望期限が過ぎるまでは取り消せません";
          patchRequest(id, { status: "cancelled", noShow: true });
          refund(r, `期限までに対応がなかったので返金：${r.title}`);
          notify(r.acceptedBy, "moderation", "引き受けた依頼が取り消されました", `${r.title}\n期限までに完了の報告がなかったため、依頼者が取り消しました。プロフィールに「途中放棄」として記録されます。`, {
            link: `/board/${id}`,
          });
          return null;
        },
        rate: (requestId, good) => {
          const me = meId();
          const r = get().requests.find((x) => x.id === requestId);
          if (!r || r.status !== "done" || !r.acceptedBy) return "完了した依頼だけ評価できます";
          const to = me === r.userId ? r.acceptedBy : me === r.acceptedBy ? r.userId : null;
          if (!to) return "当事者だけ評価できます";
          if (get().ratings.some((x) => x.requestId === requestId && x.from === me)) return "評価は1回だけです";
          set((s) => ({ ratings: [...s.ratings, { requestId, from: me, to, good, createdAt: nowIso() }] }));
          return null;
        },

        // ---- 通報・ブロック ----
        report: (targetType, targetId, targetOwner, reason) => {
          const me = meId();
          if (targetOwner === me) return "自分は通報できません";
          const s = get();
          if (s.reports.some((x) => x.reporterId === me && x.targetType === targetType && x.targetId === targetId)) return "すでに通報しています";
          if (s.reports.filter((x) => x.reporterId === me && within(x.createdAt, DAY)).length >= LIMITS.reportsPerDay) {
            return `通報は1日 ${LIMITS.reportsPerDay} 件までです`;
          }
          const wasHidden = isHidden(s, targetType, targetId);
          const wasRestricted = isRestricted(s, targetOwner);
          set((st) => ({
            reports: [...st.reports, { id: uid(), targetType, targetId, targetOwner, reporterId: me, reason, createdAt: nowIso() }],
          }));
          if (!wasHidden && isHidden(get(), targetType, targetId) && targetType !== "user") {
            notify(targetOwner, "moderation", "あなたの投稿が非表示になりました", `複数の人から通報があったため、ほかの人から見えなくなりました。`, {
              key: `hidden:${targetType}:${targetId}`,
            });
          }
          if (!wasRestricted && isRestricted(get(), targetOwner)) {
            notify(targetOwner, "moderation", "アカウントが制限されました", "通報が多く集まったため、書き込み・依頼・送金ができなくなりました。", {
              key: `restricted`,
            });
          }
          return null;
        },
        toggleBlock: (userId) => {
          const me = meId();
          if (userId === me) return;
          set((s) => {
            const cur = s.blocks[me] ?? [];
            const next = cur.includes(userId) ? cur.filter((u) => u !== userId) : [...cur, userId];
            return { blocks: { ...s.blocks, [me]: next } };
          });
        },

        markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
        markAllRead: () => {
          const me = get().me;
          set((s) => ({ notifications: s.notifications.map((n) => (n.userId === me ? { ...n, read: true } : n)) }));
        },
        markPushed: (ids) => set((s) => ({ pushed: [...s.pushed, ...ids].slice(-500) })),

        /** 時間で決まる処理：締め切り・提出状況の通知、掲載期限切れの返金、完了報告の自動支払い */
        runChecks: () => {
          const s = get();
          const now = nowMs();

          for (const r of s.requests) {
            if (r.status === "open" && new Date(r.listUntil).getTime() <= now) {
              patchRequest(r.id, { status: "cancelled" });
              refund(r, `掲載期限が過ぎたので返金：${r.title}`);
              notify(r.userId, "board", "依頼の掲載期限が過ぎました", `${r.title}\n預けていた ${r.price.toLocaleString()} ぺいを返しました。`, {
                link: `/board/${r.id}`,
                key: `expired:${r.id}`,
              });
            }
            if (r.status === "reported" && r.reportedAt && now - new Date(r.reportedAt).getTime() >= MOD.autoReleaseHours * 3600_000) {
              patchRequest(r.id, { status: "done" });
              moveMoney(ESCROW, r.acceptedBy!, r.price, `依頼の報酬（自動）：${r.title}`, "reward", r.id);
              notify(r.acceptedBy!, "money", `報酬 ${r.price.toLocaleString()} ぺいを受け取りました`, `${r.title}\n依頼者の確認がなかったため、自動で支払われました。`, {
                link: `/board/${r.id}`,
              });
            }
          }

          const me = s.me;
          if (!me) return;
          const mine = new Set(s.enrollments[me] ?? []);
          for (const a of s.assignments) {
            if (!mine.has(a.courseId) || isHidden(s, "assignment", a.id)) continue;
            const dl = new Date(a.deadline).getTime();
            if (dl <= now) continue;
            const done = s.submissions.filter((x) => x.assignmentId === a.id);
            if (done.some((x) => x.userId === me)) continue;
            const course = s.courses.find((c) => c.id === a.courseId);
            if (dl - now <= 3600_000) {
              notify(me, "due", "締め切りまで1時間を切りました", `${course?.name}「${a.title}」がまだ終わっていません`, {
                link: `/assignments/${a.id}`,
                key: `due:${a.id}`,
              });
            }
            const members = enrolledUsers(a.courseId);
            const others = members.filter((u) => u !== me);
            const doneCount = done.filter((x) => members.includes(x.userId)).length;
            if (others.length > 0 && (doneCount >= members.length * 0.9 || doneCount >= others.length)) {
              notify(me, "peers", "ほとんどの人が終わっています", `${course?.name}「${a.title}」は ${doneCount}/${members.length} 人が提出済みです`, {
                link: `/assignments/${a.id}`,
                key: `peers:${a.id}`,
              });
            }
          }
        },
      };
    },
    {
      name: "santyu-v2",
      partialize: (s) => {
        // 関数以外を保存する
        const { now: _n, ...rest } = s;
        void _n;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function")) as Partial<State>;
      },
    },
  ),
);

const LIVE_LIMIT = () => LIMITS.livePerCourseDay;

export function balanceOf(tx: Transaction[], userId: ID) {
  return tx.reduce((b, t) => b + (t.to === userId ? t.amount : 0) - (t.from === userId ? t.amount : 0), 0);
}

// ---- 通報・ブロック・信頼 ----

type ModState = Pick<Data, "reports" | "blocks" | "live">;

/** 通報した人の数（同じ人の重複は数えない） */
export function reportCount(s: Pick<Data, "reports">, type: ReportTarget, id: ID) {
  return new Set(s.reports.filter((r) => r.targetType === type && r.targetId === id).map((r) => r.reporterId)).size;
}

export function isHidden(s: Pick<Data, "reports">, type: ReportTarget, id: ID) {
  return reportCount(s, type, id) >= MOD.hideAfterReports;
}

/** 「違う」が一定数を超え、確認より多い連絡は沈める */
export function isLiveSunk(l: LiveInfo) {
  return l.denies.length >= MOD.sinkLiveAfterDenies && l.denies.length > l.confirms.length;
}

/** 非表示にされた投稿や沈んだ連絡が多い人、本人への通報が多い人は制限する */
export function isRestricted(s: ModState, userId: ID) {
  const reporters = new Map<string, Set<ID>>();
  for (const r of s.reports) {
    if (r.targetOwner !== userId) continue;
    const k = `${r.targetType}:${r.targetId}`;
    if (!reporters.has(k)) reporters.set(k, new Set());
    reporters.get(k)!.add(r.reporterId);
  }
  if ((reporters.get(`user:${userId}`)?.size ?? 0) >= MOD.restrictUserAfterReports) return true;
  let bad = s.live.filter((l) => l.userId === userId && isLiveSunk(l)).length;
  for (const [k, who] of reporters) if (!k.startsWith("user:") && who.size >= MOD.hideAfterReports) bad++;
  return bad >= MOD.restrictAfterHidden;
}

/** どちらかがブロックしていれば true */
export function isBlocked(s: Pick<Data, "blocks">, a: ID, b: ID) {
  return (s.blocks[a] ?? []).includes(b) || (s.blocks[b] ?? []).includes(a);
}

/** 自分から見えるか（自分の投稿は非表示でも見える） */
export function canSee(s: Pick<Data, "reports" | "blocks"> & { me: ID | null }, type: ReportTarget, id: ID, owner: ID) {
  if (owner === s.me) return true;
  if (s.me && (s.blocks[s.me] ?? []).includes(owner)) return false;
  return !isHidden(s, type, id);
}

export interface TradeStats {
  done: number;
  good: number;
  bad: number;
  noShow: number;
  disputes: number;
}

export function tradeStats(s: Pick<Data, "requests" | "ratings">, userId: ID): TradeStats {
  return {
    done: s.requests.filter((r) => r.status === "done" && (r.userId === userId || r.acceptedBy === userId)).length,
    good: s.ratings.filter((r) => r.to === userId && r.good).length,
    bad: s.ratings.filter((r) => r.to === userId && !r.good).length,
    noShow: s.requests.filter((r) => r.noShow && r.acceptedBy === userId).length,
    disputes: s.requests.filter((r) => r.status === "dispute" && r.acceptedBy === userId).length,
  };
}

// ---- よく使う参照 ----

export function useMe() {
  return useStore((s) => s.users.find((u) => u.id === s.me) ?? null);
}

export function useUser(id: ID | null | undefined) {
  return useStore((s) => s.users.find((u) => u.id === id) ?? null);
}

export function myCourseIds(s: Pick<State, "enrollments" | "me">) {
  return s.me ? (s.enrollments[s.me] ?? []) : [];
}

export function membersOf(s: Pick<State, "enrollments">, courseId: ID) {
  return Object.entries(s.enrollments)
    .filter(([, cs]) => cs.includes(courseId))
    .map(([u]) => u);
}

/** 今まさに授業中の、自分の授業 */
export function liveCourse(s: Pick<State, "enrollments" | "me" | "courses">, now: Date) {
  const slot = currentSlot(now);
  if (!slot) return null;
  const mine = new Set(myCourseIds(s));
  return s.courses.find((c) => mine.has(c.id) && c.day === slot.day && c.period === slot.period) ?? null;
}
