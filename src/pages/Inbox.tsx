import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import type { NotificationKind } from "../lib/types";
import { relative } from "../lib/time";
import { PageHeader } from "../components/Layout";
import { PartnerActions } from "../components/PartnerActions";
import { Button, Card, Empty, useNow } from "../components/ui";

const ICON: Record<NotificationKind, string> = {
  live: "📣",
  peers: "👥",
  due: "⏰",
  accepted: "🤝",
  money: "💰",
  board: "💬",
  system: "🎉",
  moderation: "🚩",
};

export default function Inbox() {
  const now = useNow();
  const navigate = useNavigate();
  const all = useStore((s) => s.notifications);
  const me = useStore((s) => s.me);
  const markRead = useStore((s) => s.markRead);
  const markAllRead = useStore((s) => s.markAllRead);
  const list = useMemo(() => all.filter((n) => n.userId === me), [all, me]);
  const [perm, setPerm] = useState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);

  return (
    <div className="space-y-3">
      <PageHeader
        title="受信ボックス"
        right={
          <button className="text-xs font-bold text-teal-700" onClick={markAllRead}>
            すべて既読
          </button>
        }
      />
      {perm === "default" && (
        <Card className="flex items-center gap-3">
          <p className="flex-1 text-sm">課題の締め切りや授業の連絡を、アプリを閉じていても通知で受け取れます。</p>
          <Button onClick={() => Notification.requestPermission().then(setPerm)}>通知をオン</Button>
        </Card>
      )}
      {list.length === 0 ? (
        <Card>
          <Empty>お知らせはありません</Empty>
        </Card>
      ) : (
        <ul className="space-y-2">
          {list.map((n) => (
            <li key={n.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  markRead(n.id);
                  if (n.link) navigate(n.link);
                }}
                className={`block w-full rounded-2xl p-3.5 text-left shadow-sm ring-1 ${n.read ? "bg-white ring-stone-200/70" : "bg-teal-50 ring-teal-200"}`}
              >
                <div className="flex gap-3">
                  <span className="text-2xl">{ICON[n.kind]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <span className="flex-1 font-bold leading-snug">{n.title}</span>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                    </div>
                    <p className="text-sm whitespace-pre-line text-stone-600">{n.body}</p>
                    <div className="mt-1 text-[11px] text-stone-400">{relative(n.createdAt, now)}</div>
                    {n.kind === "accepted" && n.partnerId && (
                      <div className="mt-2">
                        <PartnerActions partnerId={n.partnerId} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
