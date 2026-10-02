import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { balanceOf, myCourseIds, useStore } from "../lib/store";
import type { RequestKind } from "../lib/types";
import { fmtDateTime, fromLocalInput, toLocalInput } from "../lib/time";
import { pei } from "../lib/utils";
import { PageHeader } from "../components/Layout";
import { Button, Card, Field, inputCls, useNow } from "../components/ui";
import { REQUEST_KINDS } from "./Board";

export default function RequestNew() {
  const now = useNow();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const s = useStore();
  const me = s.me!;
  const balance = balanceOf(s.tx, me);

  // 未提出の課題から選べるようにする
  const todo = useMemo(() => {
    const mine = new Set(myCourseIds(s));
    return s.assignments
      .filter((a) => mine.has(a.courseId) && new Date(a.deadline) > now && !s.submissions.some((x) => x.assignmentId === a.id && x.userId === me))
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [s.assignments, s.submissions, s.enrollments, me, now]);

  const initialAssignment = todo.find((a) => a.id === params.get("assignment")) ?? null;
  // 既定は課題の締め切りの1時間前。すでに過ぎているときは締め切りそのものにする
  const defaultDue = (deadline?: string) => {
    if (!deadline) return toLocalInput(new Date(now.getTime() + 3 * 86400_000).toISOString());
    const dl = new Date(deadline).getTime();
    return toLocalInput(new Date(dl - 3600_000 > now.getTime() ? dl - 3600_000 : dl).toISOString());
  };

  const [kind, setKind] = useState<RequestKind>("question");
  const [assignmentId, setAssignmentId] = useState(initialAssignment?.id ?? "");
  const [title, setTitle] = useState(initialAssignment ? `「${initialAssignment.title}」でわからないところを解説してほしい` : "");
  const [detail, setDetail] = useState("");
  const [price, setPrice] = useState("200");
  const [dueAt, setDueAt] = useState(defaultDue(initialAssignment?.deadline));
  const [listHours, setListHours] = useState("24");
  const [error, setError] = useState("");

  const pickAssignment = (id: string) => {
    setAssignmentId(id);
    const a = todo.find((x) => x.id === id);
    if (a) {
      setTitle(`「${a.title}」でわからないところを解説してほしい`);
      setDueAt(defaultDue(a.deadline)); // 既定は課題の締め切りの1時間前（変更可）
    }
  };
  const assignment = todo.find((a) => a.id === assignmentId);

  const submit = () => {
    if (!title.trim()) return setError("タイトルを入力してください");
    const due = fromLocalInput(dueAt);
    const listUntil = new Date(Math.min(now.getTime() + Number(listHours) * 3600_000, new Date(due).getTime())).toISOString();
    const err = s.addRequest({
      kind,
      title: title.trim(),
      detail: detail.trim(),
      courseId: assignment?.courseId ?? null,
      assignmentId: assignment?.id ?? null,
      price: Number(price),
      listUntil,
      dueAt: due,
    });
    if (err) return setError(err);
    navigate("/board", { replace: true });
  };

  return (
    <div>
      <PageHeader title="依頼する" back />
      <Card className="space-y-4">
        <Field label="種類">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(REQUEST_KINDS) as RequestKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${kind === k ? "bg-teal-700 text-white" : "bg-stone-100 text-stone-600"}`}
              >
                {REQUEST_KINDS[k]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="未提出の課題から選ぶ（任意）" hint="選ぶと課題の内容と締め切りが共有され、希望期限は締め切りの1時間前になります">
          <select className={inputCls} value={assignmentId} onChange={(e) => pickAssignment(e.target.value)}>
            <option value="">選ばない（自由に書く）</option>
            {todo.map((a) => (
              <option key={a.id} value={a.id}>
                {s.courses.find((c) => c.id === a.courseId)?.name}：{a.title}（{fmtDateTime(a.deadline)}）
              </option>
            ))}
          </select>
        </Field>
        <Field label="タイトル">
          <input className={inputCls} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="相手にお願いしたいこと">
          <textarea
            className={`${inputCls} h-28`}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="例: 問3の考え方を 30 分くらい説明してほしいです（答えは自分で書きます）"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="即決価格（ぺい）" hint={`残高 ${pei(balance)}・投稿時に預かります`}>
            <input className={inputCls} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="掲載時間">
            <select className={inputCls} value={listHours} onChange={(e) => setListHours(e.target.value)}>
              {["3", "6", "12", "24", "48", "72", "168"].map((h) => (
                <option key={h} value={h}>
                  {Number(h) >= 24 ? `${Number(h) / 24}日` : `${h}時間`}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="希望期限">
          <input type="datetime-local" className={inputCls} value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </Field>
        {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
        <Button className="w-full" onClick={submit}>
          依頼板に出す
        </Button>
      </Card>
    </div>
  );
}
