import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { fmtDateTime, relative } from "../lib/time";
import { pei } from "../lib/utils";
import { PageHeader } from "../components/Layout";
import { PartnerActions } from "../components/PartnerActions";
import { Avatar, Button, Card, Empty, Pill, UserName, useNow } from "../components/ui";
import { REQUEST_KINDS, STATUS } from "./Board";

export default function RequestDetail() {
  const { id } = useParams();
  const now = useNow();
  const r = useStore((s) => s.requests.find((x) => x.id === id));
  const me = useStore((s) => s.me)!;
  const courses = useStore((s) => s.courses);
  const assignments = useStore((s) => s.assignments);
  const accept = useStore((s) => s.acceptRequest);
  const complete = useStore((s) => s.completeRequest);
  const cancel = useStore((s) => s.cancelRequest);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  if (!r) return <Empty>依頼が見つかりません</Empty>;
  const course = courses.find((c) => c.id === r.courseId);
  const assignment = assignments.find((a) => a.id === r.assignmentId);
  const isOwner = r.userId === me;
  const isTaker = r.acceptedBy === me;
  const expired = new Date(r.listUntil) <= now;

  return (
    <div className="space-y-4">
      <PageHeader title="依頼" back />
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Pill tone="sky">{REQUEST_KINDS[r.kind]}</Pill>
          <Pill tone={r.status === "open" ? "teal" : r.status === "accepted" ? "amber" : "stone"}>{STATUS[r.status]}</Pill>
        </div>
        <h2 className="text-xl font-black leading-snug">{r.title}</h2>
        {r.detail && <p className="mt-2 text-[15px] whitespace-pre-wrap">{r.detail}</p>}
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-stone-500">即決価格</dt>
          <dd className="font-black text-teal-700">{pei(r.price)}</dd>
          <dt className="text-stone-500">希望期限</dt>
          <dd>{fmtDateTime(r.dueAt)}</dd>
          <dt className="text-stone-500">掲載期限</dt>
          <dd>
            {fmtDateTime(r.listUntil)}（{relative(r.listUntil, now)}）
          </dd>
          {course && (
            <>
              <dt className="text-stone-500">授業</dt>
              <dd>
                <Link to={`/course/${course.id}`} className="font-bold text-teal-700">
                  {course.name}
                </Link>
              </dd>
            </>
          )}
          {assignment && (
            <>
              <dt className="text-stone-500">課題</dt>
              <dd>
                {assignment.title}（締め切り {fmtDateTime(assignment.deadline)}）
              </dd>
            </>
          )}
        </dl>
        <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3">
          <Avatar userId={r.userId} />
          <div className="text-sm">
            <UserName userId={r.userId} />
            <div className="text-xs text-stone-400">依頼者</div>
          </div>
          {r.acceptedBy && (
            <>
              <span className="mx-2 text-stone-300">→</span>
              <Avatar userId={r.acceptedBy} />
              <div className="text-sm">
                <UserName userId={r.acceptedBy} />
                <div className="text-xs text-stone-400">引き受けた人</div>
              </div>
            </>
          )}
        </div>
      </Card>

      {r.status === "open" && !isOwner && !expired && (
        <Card>
          {confirming ? (
            <div className="space-y-3">
              <p className="text-sm">
                <b>{pei(r.price)}</b> でこの依頼を引き受けます。成立すると、お互いの受信ボックスに LINE の友だち追加の案内が届きます。
              </p>
              <p className="text-xs text-stone-500">課題の代行や答えの受け渡しはしないでください。考え方の説明にとどめましょう。</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  やめる
                </Button>
                <Button className="flex-1" onClick={() => accept(r.id)}>
                  引き受ける（即決）
                </Button>
              </div>
            </div>
          ) : (
            <Button className="w-full py-3 text-base" onClick={() => setConfirming(true)}>
              {pei(r.price)} で引き受ける
            </Button>
          )}
        </Card>
      )}

      {r.status === "open" && isOwner && (
        <Button variant="danger" className="w-full" onClick={() => cancel(r.id)}>
          依頼を取り下げる
        </Button>
      )}

      {r.status === "accepted" && (isOwner || isTaker) && (
        <Card className="space-y-3">
          <p className="text-sm font-bold">依頼が成立しました</p>
          <PartnerActions partnerId={isOwner ? r.acceptedBy! : r.userId} />
          {isOwner && (
            <>
              <Button
                className="w-full"
                onClick={() => {
                  const err = complete(r.id);
                  setError(err ?? "");
                }}
              >
                完了したので {pei(r.price)} を送る
              </Button>
              {error && <p className="text-sm text-rose-600">{error}</p>}
            </>
          )}
        </Card>
      )}
      {r.status === "done" && <p className="text-center text-sm text-stone-500">この依頼は完了し、報酬が支払われました。</p>}
    </div>
  );
}
