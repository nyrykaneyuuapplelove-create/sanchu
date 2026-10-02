import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore, useUser } from "../lib/store";
import type { ID } from "../lib/types";

/** 現在時刻（デモ用の時計ずらしを含む）。30 秒ごとに更新 */
export function useNow() {
  const offset = useStore((s) => s.clockOffsetMin);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  void tick;
  return new Date(Date.now() + offset * 60_000);
}

/** アイコン。どこでもタップでその人のプロフィールへ（リンクの中に置けるよう <a> は使わない） */
export function Avatar({ userId, size = 36, ring = false }: { userId: ID; size?: number; ring?: boolean }) {
  const u = useUser(userId);
  const navigate = useNavigate();
  if (!u) return <span className="inline-block shrink-0 rounded-full bg-stone-300" style={{ width: size, height: size }} />;
  const go = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/u/${u.id}`);
  };
  return (
    <span role="link" tabIndex={0} className="shrink-0 cursor-pointer" title={u.name} onClick={go} onKeyDown={(e) => e.key === "Enter" && go(e)}>
      <img
        src={u.avatar}
        alt={u.name}
        className={`rounded-full object-cover ${ring ? "ring-2 ring-white" : ""}`}
        style={{ width: size, height: size }}
      />
    </span>
  );
}

export function UserName({ userId, className = "" }: { userId: ID; className?: string }) {
  const u = useUser(userId);
  return (
    <Link to={`/u/${userId}`} className={`font-semibold hover:underline ${className}`}>
      {u?.name ?? "退会したユーザー"}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-[15px] font-bold text-stone-800">{children}</h2>
      {right}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-sm text-stone-400">{children}</p>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full px-2 text-2xl leading-none text-stone-400" aria-label="閉じる">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-stone-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "line" }) {
  const v = {
    primary: "bg-teal-700 text-white hover:bg-teal-800 disabled:bg-stone-300",
    ghost: "bg-stone-100 text-stone-700 hover:bg-stone-200",
    danger: "bg-rose-50 text-rose-700 hover:bg-rose-100",
    line: "bg-[#06C755] text-white hover:brightness-95",
  }[variant];
  return (
    <button className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${v} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Pill({ children, tone = "stone" }: { children: ReactNode; tone?: "stone" | "teal" | "rose" | "amber" | "sky" }) {
  const t = {
    stone: "bg-stone-100 text-stone-600",
    teal: "bg-teal-50 text-teal-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-800",
    sky: "bg-sky-50 text-sky-700",
  }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${t}`}>{children}</span>;
}
