import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { canSee, membersOf, useStore } from "../lib/store";
import { DAYS, fmtDateTime, periodLabel } from "../lib/time";
import { PageHeader } from "../components/Layout";
import { LivePanel } from "../components/LivePanel";
import { Avatar, Button, Card, Empty, Pill, SectionTitle, UserName, inputCls, useNow } from "../components/ui";
import { PostItem } from "../components/PostItem";

type Tab = "board" | "tasks" | "members" | "syllabus";

export default function CoursePage() {
  const { id } = useParams();
  const now = useNow();
  const course = useStore((s) => s.courses.find((c) => c.id === id));
  const enrollments = useStore((s) => s.enrollments);
  const me = useStore((s) => s.me)!;
  const posts = useStore((s) => s.posts);
  const assignments = useStore((s) => s.assignments);
  const submissions = useStore((s) => s.submissions);
  const users = useStore((s) => s.users);
  const reports = useStore((s) => s.reports);
  const blocks = useStore((s) => s.blocks);
  const addPost = useStore((s) => s.addPost);
  const setEnrolled = useStore((s) => s.setEnrolled);
  const updateCourse = useStore((s) => s.updateCourse);
  const [tab, setTab] = useState<Tab>("board");
  const [text, setText] = useState("");
  const [syllabus, setSyllabus] = useState(course?.syllabusUrl ?? "");
  const [error, setError] = useState("");
  const [syllabusMsg, setSyllabusMsg] = useState("");

  const members = useMemo(() => (course ? membersOf({ enrollments }, course.id) : []), [enrollments, course]);
  const thread = useMemo(
    () =>
      posts
        .filter((p) => p.courseId === id && canSee({ reports, blocks, me }, "post", p.id, p.userId))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [posts, id, reports, blocks, me],
  );
  const tasks = useMemo(
    () =>
      assignments
        .filter((a) => a.courseId === id && canSee({ reports, blocks, me }, "assignment", a.id, a.createdBy))
        .sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [assignments, id, reports, blocks, me],
  );

  if (!course) return <Empty>授業が見つかりません</Empty>;
  const enrolled = members.includes(me);

  return (
    <div className="space-y-4">
      <PageHeader title={course.name} back />
      <Card className="-mt-2">
        <div className="text-sm text-stone-600">
          {DAYS[course.day]}曜 {periodLabel(course.period)}
        </div>
        <div className="text-sm text-stone-600">
          {course.teacher || "教員未登録"}　{course.room || "教室未登録"}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex -space-x-2">
            {members.slice(0, 6).map((u) => (
              <Avatar key={u} userId={u} size={28} ring />
            ))}
          </div>
          <span className="text-xs text-stone-500">{members.length} 人が履修中</span>
          <Button variant={enrolled ? "ghost" : "primary"} className="ml-auto px-3 py-1.5 text-xs" onClick={() => setEnrolled(course.id, !enrolled)}>
            {enrolled ? "履修をやめる" : "履修登録する"}
          </Button>
        </div>
      </Card>

      {enrolled && (
        <Card>
          <SectionTitle>今日の連絡</SectionTitle>
          <LivePanel course={course} />
        </Card>
      )}

      <div className="flex gap-1 rounded-xl bg-stone-200/60 p-1">
        {(
          [
            ["board", "掲示板"],
            ["tasks", "課題"],
            ["members", "履修者"],
            ["syllabus", "シラバス"],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-bold ${tab === k ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "board" && (
        <Card>
          {thread.length === 0 ? (
            <Empty>まだ書き込みはありません</Empty>
          ) : (
            <ul className="space-y-3">
              {thread.map((p) => (
                <PostItem key={p.id} p={p} now={now} />
              ))}
            </ul>
          )}
          {enrolled ? (
            <>
            <div className="mt-4 flex gap-2">
              <textarea
                className={`${inputCls} h-11 resize-none`}
                value={text}
                maxLength={500}
                onChange={(e) => setText(e.target.value)}
                placeholder="書き込む"
              />
              <Button
                className="shrink-0"
                disabled={!text.trim()}
                onClick={() => {
                  const err = addPost(course.id, text.trim());
                  setError(err ?? "");
                  if (!err) setText("");
                }}
              >
                送信
              </Button>
            </div>
            {error && <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
            </>
          ) : (
            <p className="mt-3 text-xs text-stone-400">履修登録すると書き込めます</p>
          )}
        </Card>
      )}

      {tab === "tasks" && (
        <Card>
          <SectionTitle
            right={
              enrolled && (
                <Link to={`/assignments/new?course=${course.id}`} className="text-xs font-bold text-teal-700">
                  ＋ 課題を登録
                </Link>
              )
            }
          >
            共有された課題
          </SectionTitle>
          {tasks.length === 0 ? (
            <Empty>まだ課題は登録されていません</Empty>
          ) : (
            <ul className="divide-y divide-stone-100">
              {tasks.map((a) => {
                const done = submissions.filter((x) => x.assignmentId === a.id && members.includes(x.userId));
                const rate = members.length ? Math.round((done.length / members.length) * 100) : 0;
                const mineDone = done.some((x) => x.userId === me);
                return (
                  <li key={a.id}>
                    <Link to={`/assignments/${a.id}`} className="block py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex-1 font-semibold">{a.title}</span>
                        {mineDone ? <Pill tone="teal">提出済み</Pill> : new Date(a.deadline) < now ? <Pill>締切済み</Pill> : null}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                        <span>{fmtDateTime(a.deadline)}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                          <div className="h-full bg-teal-600" style={{ width: `${rate}%` }} />
                        </div>
                        <span>提出率 {rate}%</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {tab === "members" && (
        <Card>
          <ul className="grid grid-cols-1 gap-2">
            {members.map((uid) => {
              const u = users.find((x) => x.id === uid);
              return (
                <li key={uid} className="flex items-center gap-3">
                  <Avatar userId={uid} size={40} />
                  <div>
                    <UserName userId={uid} />
                    <div className="text-xs text-stone-500">{u?.profile.faculty}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {tab === "syllabus" && (
        <Card className="space-y-3">
          {course.syllabusUrl ? (
            <>
              <a href={course.syllabusUrl} target="_blank" rel="noreferrer" className="block truncate text-sm font-bold text-teal-700 underline">
                シラバスを開く ↗
              </a>
              <iframe src={course.syllabusUrl} title="シラバス" className="h-[60vh] w-full rounded-xl border border-stone-200" />
              <p className="text-[11px] text-stone-400">大学のサイトによっては埋め込み表示ができません。そのときは上のリンクから開いてください。</p>
            </>
          ) : (
            <Empty>シラバスのリンクはまだ登録されていません</Empty>
          )}
          {syllabusMsg && <p className="text-xs font-semibold text-stone-600">{syllabusMsg}</p>}
          {enrolled && (
            <div className="flex gap-2">
              <input className={inputCls} value={syllabus} onChange={(e) => setSyllabus(e.target.value)} placeholder="https://..." />
              <Button
                className="shrink-0"
                disabled={!/^https?:\/\//.test(syllabus)}
                onClick={() => setSyllabusMsg(updateCourse(course.id, { syllabusUrl: syllabus.trim() }) ?? "保存しました")}
              >
                保存
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
