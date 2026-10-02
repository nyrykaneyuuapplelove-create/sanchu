export type ID = string;

export interface LifeEvent {
  id: ID;
  year: string; // 例: "2019" や "2019.4"
  text: string;
}

export interface Profile {
  furigana: string;
  faculty: string; // 学部学科
  grade: string; // 学年
  birthday: string;
  hometown: string;
  lineId: string; // 友だち追加用の LINE ID
  hobbies: string;
  skills: string; // 資格・スキル
  clubs: string; // 部活・サークル
  gakuchika: string; // 学生時代に力を入れたこと
  strengths: string; // 長所・短所
  future: string; // 将来の夢・志望業界
  favorite: string; // 好きなもの
  message: string; // ひとこと
  life: LifeEvent[]; // 人生史
  cardTheme: CardTheme;
}

export type CardTheme = "mint" | "sunset" | "night" | "sakura";

export interface User {
  id: ID;
  name: string;
  studentId: string;
  avatar: string; // 画像 URL（LINE のアイコン or アップロード画像）
  profile: Profile;
  createdAt: string;
}

export interface Course {
  id: ID;
  name: string;
  teacher: string;
  day: number; // 0=月 … 5=土
  period: number; // 1〜7
  room: string;
  syllabusUrl: string;
}

export interface Assignment {
  id: ID;
  courseId: ID;
  title: string;
  deadline: string; // ISO
  materials: string; // 任意。必要資料（URL や説明）
  createdBy: ID;
  createdAt: string;
}

export interface Attachment {
  name: string;
  dataUrl: string;
}

export interface Submission {
  assignmentId: ID;
  userId: ID;
  submittedAt: string;
  caution: string; // 注意書き
  minutes: number | null; // 所要時間（分）
  artifactText: string; // 成果物（文章）— 締め切り後のみ他の人に見える
  artifactFile: Attachment | null; // 成果物（ファイル）— 同上
}

export interface Post {
  id: ID;
  courseId: ID;
  userId: ID;
  text: string;
  createdAt: string;
}

export type LiveKind = "cancel" | "room" | "late" | "handout" | "other";

/** 授業中の連絡（休講・教室変更など）。同じ内容への「確認」の数で信頼度を表す */
export interface LiveInfo {
  id: ID;
  courseId: ID;
  date: string; // YYYY-MM-DD
  kind: LiveKind;
  text: string;
  userId: ID;
  createdAt: string;
  confirms: ID[];
}

export type TxCategory = "transfer" | "reward" | "bonus";

export interface Transaction {
  id: ID;
  from: ID | "system";
  to: ID;
  amount: number;
  memo: string;
  category: TxCategory;
  requestId?: ID;
  createdAt: string;
}

export type RequestKind = "question" | "study" | "tutor" | "other";
export type RequestStatus = "open" | "accepted" | "done" | "cancelled";

/** 依頼板の投稿（質問・解説の依頼、勉強会、チューター募集） */
export interface HelpRequest {
  id: ID;
  userId: ID;
  kind: RequestKind;
  title: string;
  detail: string;
  courseId: ID | null;
  assignmentId: ID | null;
  price: number; // 即決価格（ぺい）
  listUntil: string; // 掲載期限
  dueAt: string; // 希望期限
  status: RequestStatus;
  acceptedBy: ID | null;
  acceptedAt: string | null;
  createdAt: string;
}

export type NotificationKind =
  | "live"
  | "peers"
  | "due"
  | "accepted"
  | "money"
  | "board"
  | "system";

export interface AppNotification {
  id: ID;
  userId: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  read: boolean;
  key: string | null; // 重複通知を防ぐためのキー
  partnerId: ID | null; // LINE 追加・送金の相手
}
