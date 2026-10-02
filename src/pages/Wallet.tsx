import { useMemo, useState } from "react";
import { balanceOf, useStore } from "../lib/store";
import { ESCROW, type Transaction, type TxCategory } from "../lib/types";
import { fmtDateTime } from "../lib/time";
import { pei } from "../lib/utils";
import { PageHeader } from "../components/Layout";
import { useSendMoney } from "../components/SendMoney";
import { Avatar, Button, Card, Empty, Modal, SectionTitle, useNow } from "../components/ui";

const IN = "#0d9488";
const OUT = "#e11d48";
const CAT: Record<TxCategory, string> = { transfer: "送金", reward: "依頼の報酬", bonus: "ボーナス", escrow: "依頼の預け入れ", refund: "依頼の返金" };

export default function Wallet() {
  const now = useNow();
  const me = useStore((s) => s.me)!;
  const tx = useStore((s) => s.tx);
  const users = useStore((s) => s.users);
  const sendMoney = useSendMoney();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [calendar, setCalendar] = useState(false);

  const isThisMonth = ym.y === now.getFullYear() && ym.m === now.getMonth();
  const move = (d: number) =>
    setYm(({ y, m }) => {
      const t = new Date(y, m + d, 1);
      return { y: t.getFullYear(), m: t.getMonth() };
    });

  const month = useMemo(
    () =>
      tx
        .filter((t) => {
          const d = new Date(t.createdAt);
          return (t.from === me || t.to === me) && d.getFullYear() === ym.y && d.getMonth() === ym.m;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [tx, me, ym],
  );
  const income = month.filter((t) => t.to === me).reduce((a, t) => a + t.amount, 0);
  const expense = month.filter((t) => t.from === me).reduce((a, t) => a + t.amount, 0);

  const partner = (t: Transaction) => (t.to === me ? t.from : t.to);
  const partnerName = (id: string) =>
    id === "system" ? "さんちゅ" : id === ESCROW ? "預かり口座" : (users.find((u) => u.id === id)?.name ?? "退会したユーザー");

  // 何で稼いで、何に使ったか（種類ごと）
  const breakdown = (dir: "in" | "out") => {
    const m = new Map<TxCategory, number>();
    for (const t of month) if ((dir === "in" ? t.to : t.from) === me) m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="ぺい" />
      <div className="rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-600 p-5 text-white shadow">
        <div className="text-xs text-teal-100">残高</div>
        <div className="text-3xl font-black">{pei(balanceOf(tx, me))}</div>
        <Button className="mt-3 bg-white !text-teal-800 hover:bg-teal-50" onClick={() => sendMoney()}>
          送金する
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => move(-1)} className="rounded-full bg-white px-3 py-1.5 text-lg shadow-sm ring-1 ring-stone-200" aria-label="前の月">
          ‹
        </button>
        <button onClick={() => setCalendar(true)} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 font-black shadow-sm ring-1 ring-stone-200">
          📅 {ym.y}年{ym.m + 1}月
        </button>
        <button
          onClick={() => move(1)}
          disabled={isThisMonth}
          className="rounded-full bg-white px-3 py-1.5 text-lg shadow-sm ring-1 ring-stone-200 disabled:opacity-30"
          aria-label="次の月"
        >
          ›
        </button>
      </div>

      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="収入" value={`+${income.toLocaleString()}`} dot={IN} />
          <Stat label="支出" value={`−${expense.toLocaleString()}`} dot={OUT} />
          <Stat label="収支" value={`${income - expense >= 0 ? "+" : "−"}${Math.abs(income - expense).toLocaleString()}`} />
        </div>
        <DailyChart y={ym.y} m={ym.m} month={month} me={me} />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {(["in", "out"] as const).map((dir) => {
          const rows = breakdown(dir);
          const total = rows.reduce((a, r) => a + r[1], 0);
          return (
            <Card key={dir} className="p-3.5">
              <h3 className="mb-2 text-sm font-bold">{dir === "in" ? "何で稼いだ" : "何に使った"}</h3>
              {rows.length === 0 ? (
                <p className="text-xs text-stone-400">なし</p>
              ) : (
                <ul className="space-y-2">
                  {rows.map(([cat, v]) => (
                    <li key={cat}>
                      <div className="flex justify-between text-xs">
                        <span>{CAT[cat]}</span>
                        <span className="font-bold">{v.toLocaleString()}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-stone-100">
                        <div className="h-full rounded-full" style={{ width: `${(v / total) * 100}%`, background: dir === "in" ? IN : OUT }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <SectionTitle>明細</SectionTitle>
        {month.length === 0 ? (
          <Empty>この月の取引はありません</Empty>
        ) : (
          <ul className="divide-y divide-stone-100">
            {month.map((t) => {
              const p = partner(t);
              const isIn = t.to === me;
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  {p === "system" || p === ESCROW ? (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-black text-white">さ</span>
                  ) : (
                    <Avatar userId={p} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{t.memo || CAT[t.category]}</div>
                    <div className="text-[11px] text-stone-500">
                      {partnerName(p)}　{CAT[t.category]}　{fmtDateTime(t.createdAt)}
                    </div>
                  </div>
                  <span className="font-black tabular-nums">
                    {isIn ? "+" : "−"}
                    {t.amount.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {calendar && (
        <MonthPicker
          value={ym}
          now={now}
          onPick={(v) => {
            setYm(v);
            setCalendar(false);
          }}
          onClose={() => setCalendar(false)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1 text-[11px] text-stone-500">
        {dot && <span className="inline-block h-2 w-2 rounded-full" style={{ background: dot }} />}
        {label}
      </div>
      <div className="text-lg font-black tabular-nums">{value}</div>
    </div>
  );
}

/** 日ごとの収入（上）と支出（下）の棒グラフ */
function DailyChart({ y, m, month, me }: { y: number; m: number; month: Transaction[]; me: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const days = new Date(y, m + 1, 0).getDate();
  const data = Array.from({ length: days }, (_, i) => ({ day: i + 1, in: 0, out: 0 }));
  for (const t of month) {
    const d = new Date(t.createdAt).getDate() - 1;
    if (t.to === me) data[d].in += t.amount;
    else data[d].out += t.amount;
  }
  const max = Math.max(100, ...data.map((d) => Math.max(d.in, d.out)));
  const W = 320;
  const H = 150;
  const mid = H / 2;
  const slot = W / days;
  const bw = Math.min(10, slot - 2);
  const scale = (v: number) => (v / max) * (mid - 12);
  const h = hover != null ? data[hover] : null;

  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center justify-between text-[11px] text-stone-500">
        <span className="flex gap-3">
          <span className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-sm" style={{ background: IN }} />
            収入
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-sm" style={{ background: OUT }} />
            支出
          </span>
        </span>
        <span className="h-4 font-bold text-stone-700">
          {h ? `${m + 1}/${h.day}　収入 ${h.in.toLocaleString()}　支出 ${h.out.toLocaleString()}` : "棒をタップで詳細"}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full" onMouseLeave={() => setHover(null)} role="img" aria-label="日ごとの収入と支出">
        <line x1={0} x2={W} y1={mid} y2={mid} stroke="#e7e5e4" strokeWidth={1} />
        {data.map((d, i) => {
          const x = i * slot + (slot - bw) / 2;
          const hi = scale(d.in);
          const ho = scale(d.out);
          const r = Math.min(2, bw / 2);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
              <rect x={i * slot} y={0} width={slot} height={H} fill={hover === i ? "#f5f5f4" : "transparent"} />
              {d.in > 0 && <path d={roundTop(x, mid - 1, bw, Math.max(hi, 2), r)} fill={IN} />}
              {d.out > 0 && <path d={roundBottom(x, mid + 1, bw, Math.max(ho, 2), r)} fill={OUT} />}
              {(d.day === 1 || d.day % 5 === 0) && (
                <text x={i * slot + slot / 2} y={H + 11} textAnchor="middle" fontSize={9} fill="#78716c">
                  {d.day}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// 先端だけ角を丸めた棒（基線側は四角）
const roundTop = (x: number, base: number, w: number, h: number, r: number) =>
  `M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + w - r} Q${x + w},${base - h} ${x + w},${base - h + r} V${base} Z`;
const roundBottom = (x: number, base: number, w: number, h: number, r: number) =>
  `M${x},${base} V${base + h - r} Q${x},${base + h} ${x + r},${base + h} H${x + w - r} Q${x + w},${base + h} ${x + w},${base + h - r} V${base} Z`;

function MonthPicker({
  value,
  now,
  onPick,
  onClose,
}: {
  value: { y: number; m: number };
  now: Date;
  onPick: (v: { y: number; m: number }) => void;
  onClose: () => void;
}) {
  const [y, setY] = useState(value.y);
  const future = (m: number) => y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth());
  return (
    <Modal open onClose={onClose} title="月を選ぶ">
      <div className="mb-3 flex items-center justify-between">
        <button className="rounded-full bg-stone-100 px-3 py-1" onClick={() => setY(y - 1)} aria-label="前の年">
          ‹
        </button>
        <span className="text-lg font-black">{y}年</span>
        <button className="rounded-full bg-stone-100 px-3 py-1 disabled:opacity-30" disabled={y >= now.getFullYear()} onClick={() => setY(y + 1)} aria-label="次の年">
          ›
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, m) => (
          <button
            key={m}
            disabled={future(m)}
            onClick={() => onPick({ y, m })}
            className={`rounded-xl py-3 text-sm font-bold disabled:text-stone-300 ${value.y === y && value.m === m ? "bg-teal-700 text-white" : "bg-stone-50"}`}
          >
            {m + 1}月
          </button>
        ))}
      </div>
      <Button variant="ghost" className="mt-4 w-full" onClick={() => onPick({ y: now.getFullYear(), m: now.getMonth() })}>
        今月に戻る
      </Button>
    </Modal>
  );
}
