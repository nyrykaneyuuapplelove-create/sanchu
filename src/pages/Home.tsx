import { useMemo } from "react";
import { Link } from "react-router-dom";
import { balanceOf, canSee, isHidden, liveCourse, myCourseIds, useStore } from "../lib/store";
import { DAYS, PERIODS, currentSlot, fmtDateTime, fmtMin, periodLabel, relative, weekday } from "../lib/time";
import { pei } from "../lib/utils";
import { Card, Empty, Pill, SectionTitle, useNow } from "../components/ui";
import { PostItem } from "../components/PostItem";
import { RestrictedBanner } from "../components/Moderation";
import { LivePanel } from "../components/LivePanel";
import { useSendMoney } from "../components/SendMoney";

export default function Home() {
  const now = useNow();
  const s = useStore();
  const sendMoney = useSendMoney();
  const me = s.me!;
  const mine = useMemo(() => new Set(myCourseIds(s)), [s.enrollments, s.me]);
  const current = liveCourse(s, now);
  const courseOf = (id: string) => s.courses.find((c) => c.id === id);

  // 次の授業（授業中でないとき）
  const next = useMemo(() => {
    const day = weekday(now);
    const m = now.getHours() * 60 + now.getMinutes();
    const todays = s.courses
      .filter((c) => mine.has(c.id) && c.day === day && PERIODS[c.period - 1].start > m)
      .sort((a, b) => a.period - b.period);
    return todays[0] ?? null;
  }, [s.courses, mine, now]);

  const todo = useMemo(
    () =>
      s.assignments
        .filter(
          (a) =>
            mine.has(a.courseId) &&
            !isHidden(s, "assignment", a.id) &&
            new Date(a.deadline) > now &&
            !s.submissions.some((x) => x.assignmentId === a.id && x.userId === me),
        )
        .sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [s.assignments, s.submissions, s.reports, mine, me, now],
  );

  const feed = useMemo(
    () =>
      s.posts
        .filter((p) => mine.has(p.courseId) && canSee(s, "post", p.id, p.userId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 30),
    [s.posts, s.reports, s.blocks, mine],
  );

  const slot = currentSlot(now);

  return (
    <div className="space-y-4">
      <RestrictedBanner />
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-600 p-4 text-white shadow">
        <div className="flex-1">
          <div className="text-xs text-teal-100">ぺい残高</div>
          <Link to="/wallet" className="text-2xl font-black">
            {pei(balanceOf(s.tx, me))}
          </Link>
        </div>
        <button onClick={() => sendMoney()} className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-teal-800 shadow">
          送金する
        </button>
      </div>

      <Card>
        <SectionTitle right={<span className="text-xs text-stone-400">{slot ? `${DAYS[slot.day]}曜 ${slot.period}限` : ""}</span>}>
          いまの授業
        </SectionTitle>
        {current ? (
          <>
            <Link to={`/course/${current.id}`} className="mb-3 block rounded-xl bg-teal-50 p-3">
              <div className="text-lg font-black text-teal-900">{current.name}</div>
              <div className="text-xs text-teal-800">
                {periodLabel(current.period)}　{current.room}
              </div>
            </Link>
            <LivePanel course={current} />
          </>
        ) : (
          <div className="py-2 text-sm text-stone-500">
            今は授業時間外です。
            {next && (
              <Link to={`/course/${next.id}`} className="mt-2 block rounded-xl bg-stone-50 p-3 text-stone-700">
                次は <b>{next.name}</b>（{next.period}限 {fmtMin(PERIODS[next.period - 1].start)}〜 {next.room}）
              </Link>
            )}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle right={<Link to="/assignments" className="text-xs font-bold text-teal-700">すべて</Link>}>
          未提出の課題
        </SectionTitle>
        {todo.length === 0 ? (
          <Empty>未提出の課題はありません 🎉</Empty>
        ) : (
          <ul className="divide-y divide-stone-100">
            {todo.map((a) => {
              const hours = (new Date(a.deadline).getTime() - now.getTime()) / 3600_000;
              return (
                <li key={a.id}>
                  <Link to={`/assignments/${a.id}`} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-stone-500">{courseOf(a.courseId)?.name}</div>
                      <div className="truncate font-semibold">{a.title}</div>
                    </div>
                    <div className="text-right">
                      <Pill tone={hours < 24 ? "rose" : hours < 72 ? "amber" : "stone"}>{relative(a.deadline, now)}</Pill>
                      <div className="mt-0.5 text-[11px] text-stone-400">{fmtDateTime(a.deadline)}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle>みんなの掲示板</SectionTitle>
        {feed.length === 0 ? (
          <Empty>履修している授業の書き込みがここに並びます</Empty>
        ) : (
          <ul className="space-y-3">
            {feed.map((p) => (
              <PostItem key={p.id} p={p} now={now} courseName={courseOf(p.courseId)?.name} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
