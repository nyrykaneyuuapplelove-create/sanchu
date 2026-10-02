import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { myCourseIds, useStore } from "../lib/store";
import type { Assignment } from "../lib/types";
import { DAYS, fmtDateTime, fromLocalInput, toLocalInput } from "../lib/time";
import { PageHeader } from "../components/Layout";
import { Button, Card, Field, Modal, inputCls, useNow } from "../components/ui";

export default function AssignmentNew() {
  const now = useNow();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const s = useStore();
  const myCourses = useMemo(() => {
    const ids = new Set(myCourseIds(s));
    return s.courses.filter((c) => ids.has(c.id)).sort((a, b) => a.day - b.day || a.period - b.period);
  }, [s.courses, s.enrollments, s.me]);

  const [courseId, setCourseId] = useState(params.get("course") ?? myCourses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(now.getTime() + 7 * 86400_000);
    d.setHours(23, 59, 0, 0);
    return toLocalInput(d.toISOString());
  });
  const [materials, setMaterials] = useState("");
  const [dups, setDups] = useState<Assignment[] | null>(null);

  const valid = courseId && title.trim() && deadline;

  const save = () => {
    const id = s.addAssignment({ courseId, title: title.trim(), deadline: fromLocalInput(deadline), materials: materials.trim() });
    navigate(`/assignments/${id}`, { replace: true });
  };

  const trySave = () => {
    // 同じ授業・同じ時刻（前後1時間）の締め切りの課題がすでにあれば、被りではないか確認する
    const dl = new Date(fromLocalInput(deadline)).getTime();
    const same = s.assignments.filter((a) => a.courseId === courseId && Math.abs(new Date(a.deadline).getTime() - dl) <= 3600_000);
    if (same.length > 0) setDups(same);
    else save();
  };

  if (myCourses.length === 0) {
    return (
      <div>
        <PageHeader title="課題を登録" back />
        <Card>先に時間割から履修登録をしてください。</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="課題を登録" back />
      <Card className="space-y-4">
        <Field label="授業（必須）">
          <select className={inputCls} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {myCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {DAYS[c.day]}{c.period} {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="タイトル（必須）">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 第6回 レポート" />
        </Field>
        <Field label="締め切り（必須）">
          <input type="datetime-local" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
        <Field label="必要な資料（任意）" hint="教科書のページ、配布資料の名前、URL など">
          <textarea className={`${inputCls} h-20`} value={materials} onChange={(e) => setMaterials(e.target.value)} />
        </Field>
        <p className="text-xs text-stone-500">登録した課題は、この授業の履修者全員に共有されます。</p>
        <Button className="w-full" disabled={!valid} onClick={trySave}>
          登録する
        </Button>
      </Card>

      <Modal open={!!dups} onClose={() => setDups(null)} title="同じ課題ではありませんか？">
        <p className="mb-3 text-sm text-stone-600">同じ授業で、締め切りが近い課題がすでに共有されています。</p>
        <ul className="mb-4 space-y-2">
          {dups?.map((a) => (
            <li key={a.id}>
              <button className="w-full rounded-xl bg-amber-50 p-3 text-left ring-1 ring-amber-200" onClick={() => navigate(`/assignments/${a.id}`, { replace: true })}>
                <div className="font-bold">{a.title}</div>
                <div className="text-xs text-stone-500">締め切り {fmtDateTime(a.deadline)}</div>
                <div className="mt-1 text-xs font-bold text-teal-700">この課題だった → 開く</div>
              </button>
            </li>
          ))}
        </ul>
        <Button variant="ghost" className="w-full" onClick={save}>
          別の課題なので登録する
        </Button>
      </Modal>
    </div>
  );
}
