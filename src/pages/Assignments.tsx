import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { membersOf, myCourseIds, useStore } from "../lib/store";
import { fmtDateTime, relative } from "../lib/time";
import { pei } from "../lib/utils";
import { PageHeader } from "../components/Layout";
import { Avatar, Card, Empty, Pill, useNow } from "../components/ui";

type Tab = "todo" | "done" | "help";

export default function Assignments() {
  const now = useNow();
  const s = useStore();
  const me = s.me!;
  const [tab, setTab] = useState<Tab>("todo");
  const mine = useMemo(() => new Set(myCourseIds(s)), [s.enrollments, s.me]);
  const isDone = (aid: string) => s.submissions.some((x) => x.assignmentId === aid && x.userId === me);

  const list = useMemo(() => {
    const all = s.assignments.filter((a) => mine.has(a.courseId));
    if (tab === "todo") return all.filter((a) => !isDone(a.id) && new Date(a.deadline) > now).sort((a, b) => a.deadline.localeCompare(b.deadline));
    return all.filter((a) => isDone(a.id) || new Date(a.deadline) <= now).sort((a, b) => b.deadline.localeCompare(a.deadline));
  }, [s.assignments, s.submissions, mine, tab, now]);

  // 自分が引き受けた依頼（受注内容）も課題欄に出す
  const accepted = s.requests
    .filter((r) => r.acceptedBy === me && r.status === "accepted")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return (
    <div className="space-y-4">
      <PageHeader
        title="課題"
        right={
          <Link to="/assignments/new" className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white">
            ＋ 課題を登録
          </Link>
        }
      />
      <div className="flex gap-1 rounded-xl bg-stone-200/60 p-1">
        {(
          [
            ["todo", "未提出"],
            ["done", "提出済み・締切済み"],
            ["help", `引き受けた依頼${accepted.length ? ` (${accepted.length})` : ""}`],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${tab === k ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "help" ? (
        <Card>
          {accepted.length === 0 ? (
            <Empty>引き受けている依頼はありません</Empty>
          ) : (
            <ul className="divide-y divide-stone-100">
              {accepted.map((r) => (
                <li key={r.id}>
                  <Link to={`/board/${r.id}`} className="flex items-center gap-3 py-2.5">
                    <Avatar userId={r.userId} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{r.title}</div>
                      <div className="text-xs text-stone-500">期限 {fmtDateTime(r.dueAt)}</div>
                    </div>
                    <Pill tone="teal">{pei(r.price)}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card>
          {list.length === 0 ? (
            <Empty>{tab === "todo" ? "未提出の課題はありません 🎉" : "まだありません"}</Empty>
          ) : (
            <ul className="divide-y divide-stone-100">
              {list.map((a) => {
                const course = s.courses.find((c) => c.id === a.courseId);
                const members = membersOf(s, a.courseId);
                const done = s.submissions.filter((x) => x.assignmentId === a.id && members.includes(x.userId)).length;
                const rate = members.length ? Math.round((done / members.length) * 100) : 0;
                const hours = (new Date(a.deadline).getTime() - now.getTime()) / 3600_000;
                return (
                  <li key={a.id}>
                    <Link to={`/assignments/${a.id}`} className="block py-3">
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="truncate">{course?.name}</span>
                        <span className="ml-auto shrink-0">{fmtDateTime(a.deadline)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex-1 font-semibold">{a.title}</span>
                        {tab === "todo" ? (
                          <Pill tone={hours < 24 ? "rose" : hours < 72 ? "amber" : "stone"}>{relative(a.deadline, now)}</Pill>
                        ) : isDone(a.id) ? (
                          <Pill tone="teal">提出済み</Pill>
                        ) : (
                          <Pill tone="rose">未提出</Pill>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-stone-500">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                          <div className="h-full bg-teal-600" style={{ width: `${rate}%` }} />
                        </div>
                        提出率 {rate}%（{done}/{members.length}）
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
