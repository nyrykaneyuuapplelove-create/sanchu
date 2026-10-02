import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { membersOf, useStore } from "../lib/store";
import type { Submission } from "../lib/types";
import { fmtDateTime, relative } from "../lib/time";
import { readAsDataUrl } from "../lib/utils";
import { PageHeader } from "../components/Layout";
import { Avatar, Button, Card, Empty, Field, Pill, SectionTitle, UserName, inputCls, useNow } from "../components/ui";

const MAX_FILE = 1_000_000;

export default function AssignmentDetail() {
  const { id } = useParams();
  const now = useNow();
  const s = useStore();
  const me = s.me!;
  const a = s.assignments.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);

  const members = useMemo(() => (a ? membersOf(s, a.courseId) : []), [a, s.enrollments]);
  const subs = useMemo(
    () => s.submissions.filter((x) => x.assignmentId === id && members.includes(x.userId)).sort((x, y) => x.submittedAt.localeCompare(y.submittedAt)),
    [s.submissions, id, members],
  );

  if (!a) return <Empty>課題が見つかりません</Empty>;
  const course = s.courses.find((c) => c.id === a.courseId);
  const mine = subs.find((x) => x.userId === me);
  const closed = new Date(a.deadline) <= now;
  const rate = members.length ? Math.round((subs.length / members.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <PageHeader title="課題" back />
      <Card>
        <Link to={`/course/${a.courseId}`} className="text-xs font-bold text-teal-700">
          {course?.name}
        </Link>
        <h2 className="mt-1 text-xl font-black">{a.title}</h2>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span>締め切り {fmtDateTime(a.deadline)}</span>
          <Pill tone={closed ? "stone" : "rose"}>{closed ? "締切済み" : relative(a.deadline, now)}</Pill>
        </div>
        {a.materials && (
          <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm">
            <div className="mb-1 text-xs font-bold text-stone-500">必要な資料</div>
            <p className="whitespace-pre-wrap">{a.materials}</p>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
          登録: <Avatar userId={a.createdBy} size={20} /> <UserName userId={a.createdBy} />
        </div>
      </Card>

      <Card>
        <SectionTitle>
          提出率 {rate}%<span className="ml-1 text-sm font-normal text-stone-500">（{subs.length}/{members.length} 人）</span>
        </SectionTitle>
        <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" style={{ width: `${rate}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {subs.map((x) => (
            <Avatar key={x.userId} userId={x.userId} size={28} />
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>自分の提出</SectionTitle>
        {mine && !editing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pill tone="teal">提出済み</Pill>
              <span className="text-xs text-stone-500">{fmtDateTime(mine.submittedAt)}</span>
            </div>
            <SubmissionBody sub={mine} showArtifact />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setEditing(true)}>
                詳細を書く・直す
              </Button>
              <Button variant="danger" onClick={() => s.unsubmit(a.id)}>
                取り消す
              </Button>
            </div>
          </div>
        ) : editing || mine ? (
          <SubmitForm
            initial={mine}
            onDone={(detail) => {
              s.submit(a.id, detail);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="space-y-2">
            <Button className="w-full" onClick={() => s.submit(a.id)}>
              提出済みにする
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setEditing(true)}>
              注意点や所要時間も共有して提出済みにする
            </Button>
            {!closed && (
              <Link to={`/board/new?assignment=${a.id}`} className="block pt-1 text-center text-xs font-bold text-teal-700">
                わからないところを依頼板で質問する →
              </Link>
            )}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>みんなの共有</SectionTitle>
        {!closed && <p className="mb-3 rounded-xl bg-sky-50 p-2.5 text-xs text-sky-800">成果物（文章・ファイル）は、締め切りが過ぎてから公開されます。今見えるのは注意点と所要時間だけです。</p>}
        {subs.filter((x) => x.userId !== me && (x.caution || x.minutes || x.artifactText || x.artifactFile)).length === 0 ? (
          <Empty>まだ共有はありません</Empty>
        ) : (
          <ul className="space-y-4">
            {subs
              .filter((x) => x.userId !== me && (x.caution || x.minutes || x.artifactText || x.artifactFile))
              .map((x) => (
                <li key={x.userId} className="flex gap-3">
                  <Avatar userId={x.userId} />
                  <div className="min-w-0 flex-1">
                    <UserName userId={x.userId} className="text-sm" />
                    <SubmissionBody sub={x} showArtifact={closed} />
                  </div>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SubmissionBody({ sub, showArtifact }: { sub: Submission; showArtifact: boolean }) {
  const hasArtifact = !!(sub.artifactText || sub.artifactFile);
  return (
    <div className="mt-1 space-y-2 text-sm">
      {sub.minutes != null && <div className="text-xs text-stone-500">所要時間 約 {sub.minutes} 分</div>}
      {sub.caution && <p className="rounded-lg bg-amber-50 p-2 whitespace-pre-wrap">⚠ {sub.caution}</p>}
      {hasArtifact &&
        (showArtifact ? (
          <div className="rounded-lg bg-stone-50 p-2">
            {sub.artifactText && <p className="whitespace-pre-wrap">{sub.artifactText}</p>}
            {sub.artifactFile && (
              <a href={sub.artifactFile.dataUrl} download={sub.artifactFile.name} className="mt-1 block font-bold text-teal-700 underline">
                📎 {sub.artifactFile.name}
              </a>
            )}
          </div>
        ) : (
          <p className="text-xs text-stone-400">🔒 成果物は締め切り後に公開</p>
        ))}
    </div>
  );
}

function SubmitForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: Submission;
  onDone: (d: Partial<Submission>) => void;
  onCancel: () => void;
}) {
  const [caution, setCaution] = useState(initial?.caution ?? "");
  const [minutes, setMinutes] = useState(initial?.minutes != null ? String(initial.minutes) : "");
  const [artifactText, setArtifactText] = useState(initial?.artifactText ?? "");
  const [file, setFile] = useState(initial?.artifactFile ?? null);
  const [error, setError] = useState("");

  return (
    <div className="space-y-3">
      <Field label="注意書き" hint="ハマったところ、提出形式の注意など（すぐ公開されます）">
        <textarea className={`${inputCls} h-20`} value={caution} onChange={(e) => setCaution(e.target.value)} />
      </Field>
      <Field label="所要時間（分）">
        <input className={inputCls} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} />
      </Field>
      <Field label="成果物（文章）" hint="締め切り後に公開されます">
        <textarea className={`${inputCls} h-24`} value={artifactText} onChange={(e) => setArtifactText(e.target.value)} />
      </Field>
      <Field label="成果物（ファイル・1MB まで）" hint="締め切り後に公開されます">
        <input
          type="file"
          className="text-sm"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > MAX_FILE) return setError("ファイルは 1MB までです（プロトタイプはブラウザ内に保存するため）");
            setError("");
            setFile({ name: f.name, dataUrl: await readAsDataUrl(f) });
          }}
        />
        {file && (
          <span className="mt-1 flex items-center gap-2 text-xs">
            📎 {file.name}
            <button className="text-rose-600" onClick={() => setFile(null)}>
              外す
            </button>
          </span>
        )}
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel}>
          やめる
        </Button>
        <Button
          className="flex-1"
          onClick={() =>
            onDone({ caution: caution.trim(), minutes: minutes ? Number(minutes) : null, artifactText: artifactText.trim(), artifactFile: file })
          }
        >
          提出済みにして共有
        </Button>
      </div>
    </div>
  );
}
