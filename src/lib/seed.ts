import {
  ESCROW,
  type Rating,
  type Report,
  type Assignment,
  type Course,
  type HelpRequest,
  type LiveInfo,
  type Post,
  type Profile,
  type Submission,
  type Transaction,
  type User,
} from "./types";
import { hueOf, initialAvatar } from "./utils";
import { ymd } from "./time";

export const emptyProfile = (): Profile => ({
  furigana: "",
  faculty: "",
  grade: "",
  birthday: "",
  hometown: "",
  lineId: "",
  hobbies: "",
  skills: "",
  clubs: "",
  gakuchika: "",
  strengths: "",
  future: "",
  favorite: "",
  message: "",
  life: [],
  cardTheme: "mint",
});

const H = 3600_000;
const D = 24 * H;

/** デモ用の初期データ。時刻はすべて「今」からの相対で作る */
export function makeSeed(nowMs: number) {
  const at = (ms: number) => new Date(nowMs + ms).toISOString();
  const user = (id: string, name: string, studentId: string, p: Partial<Profile>): User => ({
    id,
    name,
    nameChangedAt: null,
    studentId,
    avatar: initialAvatar(name, hueOf(name)),
    profile: { ...emptyProfile(), ...p },
    createdAt: at(-120 * D),
  });

  const users: User[] = [
    user("u1", "青木 陽向", "4624001", {
      furigana: "あおき ひなた",
      faculty: "理学部 数学科",
      grade: "2年",
      birthday: "2006-05-12",
      hometown: "千葉県",
      lineId: "hinata_demo",
      hobbies: "写真・カフェめぐり・ボルダリング",
      skills: "TOEIC 720 / 基本情報技術者",
      clubs: "写真部",
      gakuchika: "写真部で学園祭の展示を企画。来場者アンケートを取り、前年より展示の滞在時間を伸ばした。",
      strengths: "長所: 粘り強い　短所: 心配性",
      future: "データを使って街づくりに関わりたい",
      favorite: "抹茶ラテ・星野源",
      message: "線形代数のノート、いつでも見せます！",
      life: [
        { id: "l1", year: "2006", text: "千葉県で生まれる" },
        { id: "l2", year: "2019", text: "中学でカメラを始める" },
        { id: "l3", year: "2022", text: "高校の写真展で入選" },
        { id: "l4", year: "2025", text: "大学入学・写真部に入部" },
      ],
      cardTheme: "mint",
    }),
    user("u2", "佐藤 蓮", "4624002", { faculty: "理学部 数学科", grade: "2年", lineId: "ren_demo", hobbies: "ギター", message: "解析学なら任せて" }),
    user("u3", "鈴木 美咲", "4624003", { faculty: "理学部 数学科", grade: "2年", lineId: "misaki_demo", hobbies: "バレー", cardTheme: "sakura" }),
    user("u4", "高橋 湊", "4624004", { faculty: "理学部 物理学科", grade: "2年", lineId: "minato_demo", hobbies: "将棋", cardTheme: "night" }),
    user("u5", "田中 結衣", "4624005", { faculty: "理学部 数学科", grade: "2年", lineId: "yui_demo", hobbies: "料理" }),
    user("u6", "伊藤 大和", "4624006", { faculty: "工学部 情報工学科", grade: "2年", lineId: "yamato_demo", hobbies: "競プロ", cardTheme: "sunset" }),
    user("u7", "渡辺 さくら", "4624007", { faculty: "理学部 数学科", grade: "2年", lineId: "sakura_demo", hobbies: "読書" }),
    user("u8", "山本 颯", "4624008", { faculty: "理学部 数学科", grade: "2年", lineId: "hayate_demo", hobbies: "サッカー" }),
    // 荒らしの例（通報で投稿が隠れている・嘘の連絡が沈んでいる・依頼を途中で放棄した）
    user("u9", "ななし", "4624009", { faculty: "理学部 数学科", grade: "2年" }),
  ];

  const c = (id: string, name: string, teacher: string, day: number, period: number, room: string): Course => ({
    id,
    name,
    teacher,
    day,
    period,
    room,
    syllabusUrl: "",
  });
  const courses: Course[] = [
    c("c1", "線形代数学2", "小林 修", 0, 1, "1号館 201"),
    c("c2", "解析学2", "中村 智子", 0, 3, "1号館 305"),
    c("c3", "プログラミング演習", "加藤 健", 1, 2, "情報棟 PC2"),
    c("c4", "確率統計", "吉田 誠", 2, 2, "2号館 101"),
    c("c5", "英語コミュニケーション", "Smith J.", 2, 4, "3号館 402"),
    c("c6", "集合と位相", "山田 隆", 3, 1, "1号館 201"),
    c("c7", "物理学実験", "松本 恵", 3, 3, "実験棟 B1"),
    c("c8", "キャリアデザイン", "井上 綾", 4, 5, "講堂"),
  ];

  const all = users.map((u) => u.id);
  const enrollments: Record<string, string[]> = {
    u1: ["c1", "c2", "c3", "c4", "c5", "c6", "c8"],
  };
  for (const u of all.slice(1)) enrollments[u] = ["c1", "c2", "c4", "c6"];
  enrollments.u4 = ["c1", "c3", "c4", "c7"];
  enrollments.u6 = ["c3", "c4", "c5", "c8"];
  enrollments.u2.push("c3", "c5");
  enrollments.u3.push("c5", "c8");
  enrollments.u9 = ["c1", "c4"];

  const a = (id: string, courseId: string, title: string, deadlineMs: number, materials = "", createdBy = "u2"): Assignment => ({
    id,
    courseId,
    title,
    deadline: at(deadlineMs),
    materials,
    createdBy,
    createdAt: at(-3 * D),
  });
  const assignments: Assignment[] = [
    a("a1", "c1", "第5回 レポート：固有値と対角化", 50 * 60_000, "講義資料 第5回 p.12〜18"),
    a("a2", "c2", "演習問題 3.1〜3.8", 2 * D, "教科書 3章", "u3"),
    a("a3", "c3", "課題4：二分探索の実装", 4 * D, "LMS の課題4ページ", "u6"),
    a("a4", "c4", "小テスト対策プリント", 6 * D, "", "u5"),
    a("a5", "c6", "位相空間の例を3つ作る", 9 * D, "", "u7"),
    a("a6", "c1", "第4回 レポート：線形写像", -2 * D),
  ];

  const sub = (assignmentId: string, userId: string, extra: Partial<Submission> = {}): Submission => ({
    assignmentId,
    userId,
    submittedAt: at(-5 * H),
    caution: "",
    minutes: null,
    artifactText: "",
    artifactFile: null,
    ...extra,
  });
  const submissions: Submission[] = [
    sub("a1", "u2", { caution: "問3は行列の次数に注意。教科書の例題4と同じ流れでいけた", minutes: 90, artifactText: "（締め切り後に公開されるサンプル）" }),
    sub("a1", "u3", { minutes: 120 }),
    sub("a1", "u5"),
    sub("a1", "u7", { caution: "提出は PDF 1 ファイルのみ" }),
    sub("a1", "u8"),
    sub("a1", "u4"),
    sub("a2", "u2", { minutes: 60 }),
    sub("a3", "u6", { caution: "入力が空のときのテストケースがある", minutes: 45 }),
    sub("a6", "u1", { submittedAt: at(-3 * D) }),
    sub("a6", "u2", { submittedAt: at(-3 * D), artifactText: "固有値を求めてから基底を取り直す方針でまとめた。" }),
    sub("a6", "u3", { submittedAt: at(-3 * D) }),
  ];

  const post = (id: string, courseId: string, userId: string, text: string, ms: number): Post => ({
    id,
    courseId,
    userId,
    text,
    createdAt: at(ms),
  });
  const posts: Post[] = [
    post("p1", "c1", "u2", "来週の授業は中間試験の範囲説明があるらしいです", -2 * H),
    post("p2", "c2", "u3", "演習3.5の (2) の条件、ε-δ でやる方針で合ってますか？", -5 * H),
    post("p3", "c2", "u2", "合ってると思う！δ の取り方は例題3.3と同じ", -4 * H),
    post("p4", "c3", "u6", "PC2 の教室、今日はプロジェクター不調らしい", -26 * H),
    post("p5", "c4", "u5", "小テストは電卓持ち込み可だそうです", -30 * H),
    post("p6", "c1", "u7", "ノート見せてくれる人いたら嬉しいです🙏", -50 * H),
    post("p7", "c1", "u9", "この授業マジで意味ない。先生の話つまらなすぎ。みんなもそう思うよね？", -90 * 60_000),
  ];

  const live: LiveInfo[] = [
    {
      id: "lv1",
      courseId: "c4",
      date: ymd(new Date(nowMs)),
      kind: "room",
      text: "今日は 2号館 101 ではなく 2号館 205 に変更",
      userId: "u5",
      createdAt: at(-30 * 60_000),
      confirms: ["u5", "u3", "u8"],
      denies: [],
      notified: true,
    },
    {
      id: "lv2",
      courseId: "c4",
      date: ymd(new Date(nowMs)),
      kind: "cancel",
      text: "今日休講らしいよ（掲示板に出てた）",
      userId: "u9",
      createdAt: at(-40 * 60_000),
      confirms: ["u9"],
      denies: ["u3", "u5", "u8"],
      notified: false,
    },
  ];

  // ぺいの履歴：3か月分ほどを散らして入れる
  const tx: Transaction[] = [];
  let n = 0;
  const t = (from: string, to: string, amount: number, memo: string, ms: number, category: Transaction["category"] = "transfer") =>
    tx.push({ id: `t${++n}`, from, to, amount, memo, category, createdAt: at(ms) });
  for (const u of all) t("system", u, 1000, "口座開設ボーナス", -100 * D, "bonus");
  t("u2", "u1", 150, "ノートのお礼", -70 * D);
  t("u1", "u3", 80, "学食おごりの代わり", -65 * D);
  t("u1", "u6", 200, "プログラミングの質問に答えてくれたお礼", -45 * D, "reward");
  t("u7", "u1", 300, "線形代数の解説ありがとう", -40 * D, "reward");
  t("u4", "u1", 120, "実験レポートの書き方を教えてもらった", -35 * D, "reward");
  t("u1", "u2", 100, "勉強会の場所取り", -20 * D);
  t("u5", "u1", 250, "確率統計の勉強会", -12 * D, "reward");
  t("u1", "u8", 60, "コピー代", -6 * D);
  t("u3", "u1", 90, "ノートのお礼", -2 * D);
  t("u1", "u7", 150, "解析学の質問", -1 * D, "reward");

  const requests: HelpRequest[] = [
    {
      id: "r1",
      userId: "u7",
      kind: "question",
      title: "固有値の重解のときの対角化がわからない",
      detail: "第5回レポートの範囲。考え方を30分くらい説明してほしいです（答えは自分で書きます）。",
      courseId: "c1",
      assignmentId: "a1",
      price: 200,
      listUntil: at(6 * H),
      dueAt: at(-10 * 60_000),
      status: "open",
      acceptedBy: null,
      acceptedAt: null,
      reportedAt: null,
      noShow: false,
      createdAt: at(-1 * H),
    },
    {
      id: "r2",
      userId: "u5",
      kind: "study",
      title: "確率統計の小テスト勉強会（金曜の昼）",
      detail: "図書館のグループ学習室で。過去問を一緒に解ける人を募集。",
      courseId: "c4",
      assignmentId: null,
      price: 100,
      listUntil: at(3 * D),
      dueAt: at(4 * D),
      status: "open",
      acceptedBy: null,
      acceptedAt: null,
      reportedAt: null,
      noShow: false,
      createdAt: at(-3 * H),
    },
    {
      id: "r3",
      userId: "u8",
      kind: "tutor",
      title: "C 言語のポインタを教えてくれる人",
      detail: "1時間ほど。オンラインでも OK。",
      courseId: "c3",
      assignmentId: null,
      price: 500,
      listUntil: at(2 * D),
      dueAt: at(5 * D),
      status: "open",
      acceptedBy: null,
      acceptedAt: null,
      reportedAt: null,
      noShow: false,
      createdAt: at(-8 * H),
    },
  ];

  // 過去の依頼（評価・途中放棄の記録のため）
  const past = (id: string, userId: string, acceptedBy: string, title: string, price: number, ms: number, status: HelpRequest["status"], noShow = false): HelpRequest => ({
    id,
    userId,
    kind: "question",
    title,
    detail: "",
    courseId: null,
    assignmentId: null,
    price,
    listUntil: at(ms),
    dueAt: at(ms),
    status,
    acceptedBy,
    acceptedAt: at(ms - D),
    reportedAt: null,
    noShow,
    createdAt: at(ms - 2 * D),
  });
  requests.push(
    past("h1", "u7", "u1", "線形代数の固有値の考え方", 300, -40 * D, "done"),
    past("h2", "u5", "u1", "確率統計の勉強会の進行役", 250, -12 * D, "done"),
    past("h3", "u1", "u7", "解析学のε-δを説明してほしい", 150, -1 * D, "done"),
    past("h4", "u3", "u9", "微分方程式の解き方を教えてほしい", 200, -9 * D, "cancelled", true),
    past("h5", "u8", "u9", "C 言語の配列の質問", 150, -4 * D, "cancelled", true),
  );
  const ratings: Rating[] = [
    { requestId: "h1", from: "u7", to: "u1", good: true, createdAt: at(-40 * D) },
    { requestId: "h1", from: "u1", to: "u7", good: true, createdAt: at(-40 * D) },
    { requestId: "h2", from: "u5", to: "u1", good: true, createdAt: at(-12 * D) },
    { requestId: "h3", from: "u1", to: "u7", good: true, createdAt: at(-1 * D) },
  ];
  // 募集中の依頼の報酬は、投稿した時点で預かっている
  for (const r of requests.filter((x) => x.status === "open")) {
    tx.push({ id: `t${++n}`, from: r.userId, to: ESCROW, amount: r.price, memo: `依頼の報酬を預けました：${r.title}`, category: "escrow", requestId: r.id, createdAt: r.createdAt });
  }

  // 荒らしの投稿は3人から通報されて非表示になっている
  const reports: Report[] = ["u2", "u3", "u5"].map((who, i) => ({
    id: `rp${i}`,
    targetType: "post",
    targetId: "p7",
    targetOwner: "u9",
    reporterId: who,
    reason: "abuse",
    createdAt: at(-60 * 60_000),
  }));

  return { users, courses, enrollments, assignments, submissions, posts, live, tx, requests, ratings, reports, blocks: {} as Record<string, string[]> };
}
