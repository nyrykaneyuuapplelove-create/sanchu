import { useMemo, useState } from "react";
import { LIVE_KINDS, canSee, isHidden, isLiveSunk, liveCourse, useStore } from "../lib/store";
import { MOD } from "../lib/moderation";
import type { Course, LiveInfo, LiveKind } from "../lib/types";
import { relative, ymd } from "../lib/time";
import { HiddenNote, ModMenu } from "./Moderation";
import { Avatar, Button, Empty, Pill, inputCls, useNow } from "./ui";

/**
 * 授業中の連絡（休講・教室変更・配布物など）。
 * 授業時間中だけ、その授業の履修者が投稿できる。
 * 嘘の連絡対策：投稿者のほかに誰かが「確認」するまでは全員に通知しない。「違う」が多い連絡は沈める。
 */
export function LivePanel({ course }: { course: Course }) {
  const now = useNow();
  const me = useStore((s) => s.me)!;
  const allLive = useStore((s) => s.live);
  const reports = useStore((s) => s.reports);
  const blocks = useStore((s) => s.blocks);
  const addLive = useStore((s) => s.addLive);
  const deleteLive = useStore((s) => s.deleteLive);
  const isNow = useStore((s) => liveCourse(s, now)?.id === course.id);
  const [kind, setKind] = useState<LiveKind>("room");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [showSunk, setShowSunk] = useState(false);

  const today = ymd(now);
  const { items, sunk } = useMemo(() => {
    const list = allLive
      .filter((l) => l.courseId === course.id && l.date === today && canSee({ reports, blocks, me }, "live", l.id, l.userId))
      .sort((a, b) => b.confirms.length - b.denies.length - (a.confirms.length - a.denies.length) || b.createdAt.localeCompare(a.createdAt));
    return { items: list.filter((l) => !isLiveSunk(l)), sunk: list.filter((l) => isLiveSunk(l)) };
  }, [allLive, course.id, today, reports, blocks, me]);

  const post = () => {
    const err = addLive(course.id, kind, text.trim());
    if (err) return setError(err);
    setError("");
    setText("");
  };

  return (
    <div>
      {items.length === 0 && sunk.length === 0 ? (
        <Empty>今日の連絡はまだありません</Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((l, i) => (
            <LiveItem key={l.id} l={l} top={i === 0} now={now} onDelete={() => deleteLive(l.id)} />
          ))}
        </ul>
      )}
      {sunk.length > 0 && (
        <div className="mt-2">
          <button className="text-[11px] font-bold text-stone-400" onClick={() => setShowSunk(!showSunk)}>
            {showSunk ? "▲" : "▼"} 「違う」が多い連絡 {sunk.length} 件
          </button>
          {showSunk && (
            <ul className="mt-2 space-y-2 opacity-60">
              {sunk.map((l) => (
                <LiveItem key={l.id} l={l} top={false} now={now} onDelete={() => deleteLive(l.id)} />
              ))}
            </ul>
          )}
        </div>
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
            <input className={inputCls} value={text} maxLength={120} onChange={(e) => setText(e.target.value)} placeholder="例: 今日は 205 教室に変更" />
            <Button className="shrink-0" onClick={post} disabled={!text.trim()}>
              共有
            </Button>
          </div>
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <p className="text-[11px] text-stone-400">
            ほかの {MOD.notifyLiveAfterConfirms - 1} 人が「確認」すると、履修者全員に通知されます。嘘の連絡や出席コードの共有は通報の対象です。
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-stone-400">連絡の投稿は授業時間中だけできます</p>
      )}
    </div>
  );
}

function LiveItem({ l, top, now, onDelete }: { l: LiveInfo; top: boolean; now: Date; onDelete: () => void }) {
  const me = useStore((s) => s.me)!;
  const vote = useStore((s) => s.voteLive);
  const hidden = useStore((s) => l.userId === me && isHidden(s, "live", l.id));
  const [error, setError] = useState("");
  const mine = l.userId === me;
  const confirmed = l.confirms.includes(me);
  const denied = l.denies.includes(me);
  const v = (x: "confirm" | "deny") => setError(vote(l.id, x) ?? "");

  return (
    <li className={`rounded-xl p-3 ${top && l.notified ? "bg-amber-50 ring-1 ring-amber-200" : "bg-stone-50"}`}>
      <div className="flex items-start gap-2">
        <Avatar userId={l.userId} size={28} />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
            <Pill tone={l.kind === "cancel" ? "rose" : "amber"}>{LIVE_KINDS[l.kind]}</Pill>
            {!l.notified && <Pill>未確認</Pill>}
            <span className="text-[11px] text-stone-400">{relative(l.createdAt, now)}</span>
          </div>
          <p className="text-[15px] font-semibold break-words">{l.text}</p>
          {hidden && <HiddenNote />}
        </div>
        <ModMenu type="live" id={l.id} owner={l.userId} onDelete={onDelete} />
      </div>
      <div className="mt-2 flex items-center gap-2 pl-9">
        <button
          disabled={mine}
          onClick={() => v("confirm")}
          className={`rounded-full px-2.5 py-1 text-xs font-bold disabled:opacity-60 ${confirmed ? "bg-teal-700 text-white" : "bg-white text-teal-700 ring-1 ring-teal-700/30"}`}
        >
          ✓ 確認 {l.confirms.length}
        </button>
        <button
          disabled={mine}
          onClick={() => v("deny")}
          className={`rounded-full px-2.5 py-1 text-xs font-bold disabled:opacity-60 ${denied ? "bg-rose-600 text-white" : "bg-white text-rose-600 ring-1 ring-rose-600/30"}`}
        >
          ✗ 違う {l.denies.length}
        </button>
        {error && <span className="text-[11px] text-rose-600">{error}</span>}
      </div>
    </li>
  );
}
