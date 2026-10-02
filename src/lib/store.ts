import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppNotification,
  Assignment,
  Course,
  HelpRequest,
  ID,
  LiveInfo,
  LiveKind,
  NotificationKind,
  Post,
  Profile,
  Submission,
  Transaction,
  User,
} from "./types";
import { emptyProfile, makeSeed } from "./seed";
import { normalize, uid } from "./utils";
import { currentSlot, ymd } from "./time";

export const LIVE_KINDS: Record<LiveKind, string> = {
  cancel: "休講",
  room: "教室変更",
  late: "開始が遅れる",
  handout: "配布物・連絡",
  other: "その他",
};

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
  register(input: { name: string; studentId: string; avatar: string; lineId: string }): ID;
  updateMe(patch: Partial<Pick<User, "name" | "avatar">>): void;
  updateProfile(patch: Partial<Profile>): void;
  setClockOffset(min: number): void;
  resetDemo(): void;

  importTimetable(rows: { name: string; teacher: string; day: number; period: number; room: string }[]): {
    created: number;
    enrolled: number;
  };
  addCourse(c: Omit<Course, "id" | "syllabusUrl">): ID;
  updateCourse(id: ID, patch: Partial<Course>): void;
  setEnrolled(courseId: ID, on: boolean): void;

  addAssignment(a: Omit<Assignment, "id" | "createdBy" | "createdAt">): ID;
  submit(assignmentId: ID, detail?: Partial<Omit<Submission, "assignmentId" | "userId" | "submittedAt">>): void;
  unsubmit(assignmentId: ID): void;

  addPost(courseId: ID, text: string): void;
  addLive(courseId: ID, kind: LiveKind, text: string): void;
  toggleConfirmLive(id: ID): void;

  send(to: ID, amount: number, memo: string, requestId?: ID): string | null;

  addRequest(r: Omit<HelpRequest, "id" | "userId" | "status" | "acceptedBy" | "acceptedAt" | "createdAt">): void;
  acceptRequest(id: ID): void;
  completeRequest(id: ID): string | null;
  cancelRequest(id: ID): void;

  markRead(id: ID): void;
  markAllRead(): void;
  markPushed(ids: ID[]): void;
  runChecks(): void;
}

function seedData(): Data {
  const s = makeSeed(Date.now());
  return { ...s, notifications: [] };
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
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
          createdAt: get().now().toISOString(),
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
      const enrolledUsers = (courseId: ID) =>
        Object.entries(get().enrollments)
          .filter(([, cs]) => cs.includes(courseId))
          .map(([u]) => u);

      return {
        ...seedData(),
        me: null,
        clockOffsetMin: 0,
        pushed: [],

        now: () => new Date(Date.now() + get().clockOffsetMin * 60_000),

        loginAs: (id) => set({ me: id }),
        logout: () => set({ me: null }),

        register: ({ name, studentId, avatar, lineId }) => {
          const id = uid();
          const now = get().now().toISOString();
          const user: User = { id, name, studentId, avatar, profile: { ...emptyProfile(), lineId }, createdAt: now };
          const bonus: Transaction = {
            id: uid(),
            from: "system",
            to: id,
            amount: 1000,
            memo: "口座開設ボーナス",
            category: "bonus",
            createdAt: now,
          };
          set((s) => ({
            users: [...s.users, user],
            enrollments: { ...s.enrollments, [id]: [] },
            tx: [...s.tx, bonus],
            me: id,
          }));
          notify(id, "system", "口座を開設しました", "学内通貨ぺいの口座ができました。開設ボーナス 1,000 ぺいを入金しました。", {
            link: "/wallet",
          });
          return id;
        },

        updateMe: (patch) => {
          const me = meId();
          set((s) => ({ users: s.users.map((u) => (u.id === me ? { ...u, ...patch } : u)) }));
        },
        updateProfile: (patch) => {
          const me = meId();
          set((s) => ({
            users: s.users.map((u) => (u.id === me ? { ...u, profile: { ...u.profile, ...patch } } : u)),
          }));
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
              course = { id: uid(), name: r.name.trim(), teacher: r.teacher.trim(), day: r.day, period: r.period, room: r.room.trim(), syllabusUrl: "" };
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
        addCourse: (c) => {
          const id = uid();
          set((s) => ({ courses: [...s.courses, { ...c, id, syllabusUrl: "" }] }));
          get().setEnrolled(id, true);
          return id;
        },
        updateCourse: (id, patch) =>
          set((s) => ({ courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
        setEnrolled: (courseId, on) => {
          const me = meId();
          set((s) => {
            const cur = s.enrollments[me] ?? [];
            const next = on ? [...new Set([...cur, courseId])] : cur.filter((c) => c !== courseId);
            return { enrollments: { ...s.enrollments, [me]: next } };
          });
        },

        addAssignment: (a) => {
          const id = uid();
          const me = meId();
          set((s) => ({
            assignments: [...s.assignments, { ...a, id, createdBy: me, createdAt: get().now().toISOString() }],
          }));
          return id;
        },
        submit: (assignmentId, detail = {}) => {
          const me = meId();
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
            submittedAt: prev?.submittedAt ?? get().now().toISOString(),
          };
          set((s) => ({
            submissions: [...s.submissions.filter((x) => !(x.assignmentId === assignmentId && x.userId === me)), next],
          }));
        },
        unsubmit: (assignmentId) => {
          const me = meId();
          set((s) => ({ submissions: s.submissions.filter((x) => !(x.assignmentId === assignmentId && x.userId === me)) }));
        },

        addPost: (courseId, text) => {
          const me = meId();
          set((s) => ({
            posts: [...s.posts, { id: uid(), courseId, userId: me, text, createdAt: get().now().toISOString() }],
          }));
        },
        addLive: (courseId, kind, text) => {
          const me = meId();
          const course = get().courses.find((c) => c.id === courseId)!;
          const info: LiveInfo = {
            id: uid(),
            courseId,
            date: ymd(get().now()),
            kind,
            text,
            userId: me,
            createdAt: get().now().toISOString(),
            confirms: [me],
          };
          set((s) => ({ live: [...s.live, info] }));
          for (const u of enrolledUsers(courseId)) {
            if (u === me) continue;
            notify(u, "live", `${course.name}：${LIVE_KINDS[kind]}`, text, { link: `/course/${courseId}`, key: `live:${info.id}` });
          }
        },
        toggleConfirmLive: (id) => {
          const me = meId();
          set((s) => ({
            live: s.live.map((l) =>
              l.id !== id ? l : { ...l, confirms: l.confirms.includes(me) ? l.confirms.filter((u) => u !== me) : [...l.confirms, me] },
            ),
          }));
        },

        send: (to, amount, memo, requestId) => {
          const me = meId();
          if (to === me) return "自分には送金できません";
          if (!Number.isInteger(amount) || amount <= 0) return "金額は 1 以上の整数で入力してください";
          if (balanceOf(get().tx, me) < amount) return "残高が足りません";
          const t: Transaction = {
            id: uid(),
            from: me,
            to,
            amount,
            memo,
            category: requestId ? "reward" : "transfer",
            requestId,
            createdAt: get().now().toISOString(),
          };
          set((s) => ({ tx: [...s.tx, t] }));
          notify(to, "money", `${nameOf(me)}さんから ${amount.toLocaleString()} ぺい`, memo || "送金がありました", {
            link: "/wallet",
            partnerId: me,
          });
          return null;
        },

        addRequest: (r) => {
          const me = meId();
          set((s) => ({
            requests: [
              ...s.requests,
              { ...r, id: uid(), userId: me, status: "open", acceptedBy: null, acceptedAt: null, createdAt: get().now().toISOString() },
            ],
          }));
        },
        acceptRequest: (id) => {
          const me = meId();
          const r = get().requests.find((x) => x.id === id);
          if (!r || r.status !== "open" || r.userId === me) return;
          set((s) => ({
            requests: s.requests.map((x) =>
              x.id === id ? { ...x, status: "accepted", acceptedBy: me, acceptedAt: get().now().toISOString() } : x,
            ),
          }));
          // 確定したらお互いの受信ボックスに相手の LINE 追加・送金への導線を出す
          notify(r.userId, "accepted", `${nameOf(me)}さんが依頼を引き受けました`, `${r.title}\nLINE で連絡を取り合いましょう。終わったら報酬を送ってください。`, {
            link: `/board/${id}`,
            partnerId: me,
            key: `accepted:${id}`,
          });
          notify(me, "accepted", `${nameOf(r.userId)}さんの依頼を引き受けました`, `${r.title}\nLINE で連絡を取り合いましょう。`, {
            link: `/board/${id}`,
            partnerId: r.userId,
            key: `accepted:${id}`,
          });
        },
        completeRequest: (id) => {
          const r = get().requests.find((x) => x.id === id);
          if (!r || r.status !== "accepted" || !r.acceptedBy) return "完了できない状態です";
          const err = get().send(r.acceptedBy, r.price, `依頼の報酬：${r.title}`, id);
          if (err) return err;
          set((s) => ({ requests: s.requests.map((x) => (x.id === id ? { ...x, status: "done" } : x)) }));
          return null;
        },
        cancelRequest: (id) =>
          set((s) => ({ requests: s.requests.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x)) })),

        markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
        markAllRead: () => {
          const me = get().me;
          set((s) => ({ notifications: s.notifications.map((n) => (n.userId === me ? { ...n, read: true } : n)) }));
        },
        markPushed: (ids) => set((s) => ({ pushed: [...s.pushed, ...ids].slice(-500) })),

        /** 時間で決まる通知（締め切り1時間前・みんな終わってる）をまとめて確認する */
        runChecks: () => {
          const s = get();
          const me = s.me;
          if (!me) return;
          const now = s.now().getTime();
          const mine = new Set(s.enrollments[me] ?? []);
          for (const a of s.assignments) {
            if (!mine.has(a.courseId)) continue;
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
      name: "santyu-v1",
      partialize: (s) => {
        // 関数以外を保存する
        const { now: _n, ...rest } = s;
        void _n;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function")) as Partial<State>;
      },
    },
  ),
);

export function balanceOf(tx: Transaction[], userId: ID) {
  return tx.reduce((b, t) => b + (t.to === userId ? t.amount : 0) - (t.from === userId ? t.amount : 0), 0);
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
