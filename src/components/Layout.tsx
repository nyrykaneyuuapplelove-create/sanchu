import { useEffect, type ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMe, useStore } from "../lib/store";
import { Avatar } from "./ui";

const I = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  check: "M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11",
  hand: "M7 11V5a2 2 0 1 1 4 0v5m0-1V4a2 2 0 1 1 4 0v6m0-3a2 2 0 1 1 4 0v7a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3l-3-5a2 2 0 0 1 3-2l2 2",
  wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zm13 7h.01",
  bell: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9m4.3 13a2 2 0 0 0 3.4 0",
};

export function Icon({ d, className = "h-6 w-6" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

const TABS = [
  { to: "/", label: "ホーム", d: I.home },
  { to: "/timetable", label: "時間割", d: I.grid },
  { to: "/assignments", label: "課題", d: I.check },
  { to: "/board", label: "依頼板", d: I.hand },
  { to: "/wallet", label: "ぺい", d: I.wallet },
];

/** 時間で決まる通知を定期的に確認し、新しい通知はブラウザ（アプリ）通知でも出す */
function NotificationWatcher() {
  const runChecks = useStore((s) => s.runChecks);
  const navigate = useNavigate();
  useEffect(() => {
    const tick = () => {
      runChecks();
      const s = useStore.getState();
      const fresh = s.notifications.filter((n) => n.userId === s.me && !n.read && !s.pushed.includes(n.id));
      if (fresh.length === 0) return;
      s.markPushed(fresh.map((n) => n.id));
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      for (const n of fresh.slice(0, 3)) {
        const pn = new Notification(n.title, { body: n.body, icon: "/icon.svg", tag: n.id });
        pn.onclick = () => {
          window.focus();
          s.markRead(n.id);
          navigate(n.link ?? "/inbox");
        };
      }
    };
    tick();
    const t = setInterval(tick, 20_000);
    return () => clearInterval(t);
  }, [runChecks, navigate]);
  return null;
}

export function Layout() {
  const me = useMe();
  const unread = useStore((s) => s.notifications.filter((n) => n.userId === s.me && !n.read).length);
  if (!me) return null;
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-stone-50 pb-24">
      <NotificationWatcher />
      <header className="sticky top-0 z-30 flex items-center justify-between bg-stone-50/90 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2 backdrop-blur">
        <Link to="/" className="text-xl font-black tracking-tight text-teal-800">
          さんちゅ
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/inbox" className="relative text-stone-700" aria-label="受信ボックス">
            <Icon d={I.bell} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[11px] font-bold leading-[18px] text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          <Link to="/me" aria-label="マイページ">
            <img src={me.avatar} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
          </Link>
        </div>
      </header>
      <main className="px-4">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="grid grid-cols-5">
          {TABS.map((t) => (
            <li key={t.to}>
              <NavLink
                to={t.to}
                end={t.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${isActive ? "text-teal-700" : "text-stone-400"}`
                }
              >
                <Icon d={t.d} />
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({ title, back, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="mb-4 flex items-center gap-2 pt-1">
      {back && (
        <button onClick={() => navigate(-1)} className="-ml-2 rounded-full p-1 text-stone-500" aria-label="戻る">
          <Icon d="M15 18l-6-6 6-6" />
        </button>
      )}
      <h1 className="flex-1 text-2xl font-black text-stone-900">{title}</h1>
      {right}
    </div>
  );
}

export { Avatar };
