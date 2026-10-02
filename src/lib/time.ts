export const DAYS = ["月", "火", "水", "木", "金", "土"];

/** 時限の開始・終了（分）。大学に合わせてここを変える */
export const PERIODS: { start: number; end: number }[] = [
  { start: 8 * 60 + 50, end: 10 * 60 + 20 },
  { start: 10 * 60 + 30, end: 12 * 60 },
  { start: 12 * 60 + 50, end: 14 * 60 + 20 },
  { start: 14 * 60 + 30, end: 16 * 60 },
  { start: 16 * 60 + 10, end: 17 * 60 + 40 },
  { start: 17 * 60 + 50, end: 19 * 60 + 20 },
  { start: 19 * 60 + 30, end: 21 * 60 },
];

export const fmtMin = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

export const periodLabel = (p: number) =>
  `${p}限 ${fmtMin(PERIODS[p - 1].start)}〜${fmtMin(PERIODS[p - 1].end)}`;

/** Date → 0=月 … 6=日 */
export const weekday = (d: Date) => (d.getDay() + 6) % 7;

/** 今が授業中ならその [曜日, 時限] を返す */
export function currentSlot(now: Date): { day: number; period: number } | null {
  const day = weekday(now);
  if (day > 5) return null;
  const m = now.getHours() * 60 + now.getMinutes();
  const i = PERIODS.findIndex((p) => m >= p.start && m < p.end);
  return i < 0 ? null : { day, period: i + 1 };
}

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}(${"日月火水木金土"[d.getDay()]}) ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function relative(iso: string, now: Date) {
  const diff = (new Date(iso).getTime() - now.getTime()) / 60000;
  const a = Math.abs(diff);
  const s =
    a < 1 ? "いま" : a < 60 ? `${Math.round(a)}分` : a < 60 * 24 ? `${Math.round(a / 60)}時間` : `${Math.round(a / 1440)}日`;
  if (s === "いま") return s;
  return diff > 0 ? `あと${s}` : `${s}前`;
}

/** <input type="datetime-local"> 用 */
export function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export const fromLocalInput = (v: string) => new Date(v).toISOString();
