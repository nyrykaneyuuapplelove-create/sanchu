import { useMemo, useState } from "react";
import { LIVE_KINDS, liveCourse, useStore } from "../lib/store";
import type { Course, LiveKind } from "../lib/types";
import { relative, ymd } from "../lib/time";
import { Avatar, Button, Empty, Pill, inputCls, useNow } from "./ui";

/**
 * 授業中の連絡（休講・教室変更・配布物など）。
 * 授業時間中だけ、その授業の履修者が投稿できる。同じ連絡に「確認」した人の数が多い順に並ぶ。
 */
export function LivePanel({ course }: { course: Course }) {
  const now = useNow();
  const me = useStore((s) => s.me);
  const allLive = useStore((s) => s.live);
  const addLive = useStore((s) => s.addLive);
  const toggle = useStore((s) => s.toggleConfirmLive);
  const isNow = useStore((s) => liveCourse(s, now)?.id === course.id);
  const [kind, setKind] = useState<LiveKind>("room");
  const [text, setText] = useState("");

  const today = ymd(now);
  const items = useMemo(
    () =>
      allLive
        .filter((l) => l.courseId === course.id && l.date === today)
        .sort((a, b) => b.confirms.length - a.confirms.length || b.createdAt.localeCompare(a.createdAt)),
    [allLive, course.id, today],
  );

  const post = () => {
    if (!text.trim()) return;
    addLive(course.id, kind, text.trim());
    setText("");
  };

  return (
    <div>
      {items.length === 0 ? (
        <Empty>今日の連絡はまだありません</Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((l, i) => {
            const mine = !!me && l.confirms.includes(me);
            return (
              <li key={l.id} className={`rounded-xl p-3 ${i === 0 ? "bg-amber-50 ring-1 ring-amber-200" : "bg-stone-50"}`}>
                <div className="flex items-start gap-2">
                  <Avatar userId={l.userId} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <Pill tone={l.kind === "cancel" ? "rose" : "amber"}>{LIVE_KINDS[l.kind]}</Pill>
                      <span className="text-[11px] text-stone-400">{relative(l.createdAt, now)}</span>
                    </div>
                    <p className="text-[15px] font-semibold break-words">{l.text}</p>
                  </div>
                  <button
                    onClick={() => toggle(l.id)}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${mine ? "bg-teal-700 text-white" : "bg-white text-teal-700 ring-1 ring-teal-700/30"}`}
                  >
                    確認 {l.confirms.length}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {isNow ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(LIVE_KINDS) as LiveKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${kind === k ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"}`}
              >
                {LIVE_KINDS[k]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="例: 今日は 205 教室に変更" />
            <Button className="shrink-0" onClick={post} disabled={!text.trim()}>
              共有
            </Button>
          </div>
          <p className="text-[11px] text-stone-400">共有すると、この授業の履修者全員に通知が届きます。出席コードなどの共有はしないでください。</p>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-stone-400">連絡の投稿は授業時間中だけできます</p>
      )}
    </div>
  );
}
