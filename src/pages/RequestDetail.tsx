import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { canSee, useStore } from "../lib/store";
import { MOD } from "../lib/moderation";
import { fmtDateTime, relative } from "../lib/time";
import { pei } from "../lib/utils";
import { PageHeader } from "../components/Layout";
import { ModMenu, TradeBadge } from "../components/Moderation";
import { PartnerActions } from "../components/PartnerActions";
import { Avatar, Button, Card, Empty, Pill, UserName, useNow } from "../components/ui";
import { REQUEST_KINDS, STATUS } from "./Board";

export default function RequestDetail() {
  const { id } = useParams();
  const now = useNow();
  const s = useStore();
  const me = s.me!;
  const r = s.requests.find((x) => x.id === id);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const run = (err: string | null) => setError(err ?? "");

  if (!r || (!canSee(s, "request", r.id, r.userId) && r.acceptedBy !== me)) return <Empty>依頼が見つかりません</Empty>;
  const course = s.courses.find((c) => c.id === r.courseId);
  const assignment = s.assignments.find((a) => a.id === r.assignmentId);
  const isOwner = r.userId === me;
  const isTaker = r.acceptedBy === me;
  const expired = new Date(r.listUntil) <= now;
  const overdue = new Date(r.dueAt) <= now;
  const myRating = s.ratings.find((x) => x.requestId === r.id && x.from === me);
  const autoAt = r.reportedAt ? new Date(new Date(r.reportedAt).getTime() + MOD.autoReleaseHours * 3600_000).toISOString() : null;

  return (
    <div className="space-y-4">
      <PageHeader title="依頼" back />
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Pill tone="sky">{REQUEST_KINDS[r.kind]}</Pill>
          <Pill tone={r.status === "open" ? "teal" : r.status === "dispute" ? "rose" : r.status === "done" || r.status === "cancelled" ? "stone" : "amber"}>
            {STATUS[r.status]}
          </Pill>
          <span className="flex-1" />
          <ModMenu
            type="request"
            id={r.id}
            owner={r.userId}
            onDelete={isOwner && r.status === "open" ? () => run(s.cancelRequest(r.id)) : undefined}
          />
        </div>
        <h2 className="text-xl font-black leading-snug">{r.title}</h2>
        {r.detail && <p className="mt-2 text-[15px] whitespace-pre-wrap">{r.detail}</p>}
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-stone-500">即決価格</dt>
          <dd className="font-black text-teal-700">
            {pei(r.price)}{" "}
            <span className="text-[11px] font-normal text-stone-500">
              （{r.status === "done" ? "支払い済み" : r.status === "cancelled" ? "返金済み" : "預かり中"}）
            </span>
          </dd>
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
        <div className="mt-4 space-y-2 border-t border-stone-100 pt-3">
          <Person userId={r.userId} label="依頼者" />
          {r.acceptedBy && <Person userId={r.acceptedBy} label="引き受けた人" />}
        </div>
      </Card>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}

      {/* 募集中：ほかの人は引き受けられる。依頼者は取り下げられる */}
      {r.status === "open" && !isOwner && !expired && (
        <Card>
          {confirming ? (
            <div className="space-y-3">
              <p className="text-sm">
                <b>{pei(r.price)}</b> でこの依頼を引き受けます。成立すると、お互いの受信ボックスに LINE の友だち追加の案内が届きます。
              </p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-stone-600">
                <li>報酬は預かっています。依頼者が「完了を確認」すると受け取れます</li>
                <li>完了を報告してから {MOD.autoReleaseHours} 時間、依頼者が何もしなければ自動で受け取れます</li>
                <li>期限までに対応しないと「途中放棄」としてプロフィールに記録されます</li>
                <li>課題の代行や答えの受け渡しは禁止です（通報の対象）</li>
              </ul>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  やめる
                </Button>
                <Button className="flex-1" onClick={() => run(s.acceptRequest(r.id))}>
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
        <Button variant="danger" className="w-full" onClick={() => run(s.cancelRequest(r.id))}>
          依頼を取り下げる（預けた {pei(r.price)} は返ってきます）
        </Button>
      )}

      {/* 成立後：当事者だけに出す */}
      {(r.status === "accepted" || r.status === "reported" || r.status === "dispute") && (isOwner || isTaker) && (
        <Card className="space-y-3">
          <PartnerActions partnerId={isOwner ? r.acceptedBy! : r.userId} />

          {isTaker && r.status === "accepted" && (
            <>
              <Button className="w-full" onClick={() => run(s.reportDone(r.id))}>
                終わったので完了を報告する
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => confirm("辞退して募集中に戻します。よろしいですか？") && run(s.withdrawRequest(r.id))}>
                辞退する
              </Button>
            </>
          )}
          {isTaker && r.status === "reported" && (
            <p className="text-sm text-stone-600">
              完了を報告しました。依頼者が確認するか、{autoAt && fmtDateTime(autoAt)} になると報酬を受け取れます。
            </p>
          )}

          {isOwner && r.status === "reported" && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm">
              引き受けた人から完了の報告が届いています。問題なければ「完了を確認」してください。
              {autoAt && <b>{fmtDateTime(autoAt)} を過ぎると自動で支払われます。</b>}
            </p>
          )}
          {isOwner && (
            <Button className="w-full" onClick={() => run(s.confirmDone(r.id))}>
              完了を確認して {pei(r.price)} を渡す
            </Button>
          )}
          {isOwner && r.status === "reported" && (
            <Button variant="danger" className="w-full" onClick={() => confirm("問題を報告すると、報酬は預かったままになります。よろしいですか？") && run(s.disputeRequest(r.id))}>
              問題があった（まだ終わっていない・約束と違う）
            </Button>
          )}
          {isOwner && r.status === "accepted" && overdue && (
            <Button variant="danger" className="w-full" onClick={() => confirm("期限までに対応がなかったとして取り消し、預けたぺいを返してもらいます。よろしいですか？") && run(s.cancelNoShow(r.id))}>
              期限までに対応がなかったので取り消す
            </Button>
          )}
          {r.status === "dispute" && (
            <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
              問題が報告されています。報酬は預かったままです。話し合って解決したら、依頼者が「完了を確認」すると支払われます。
            </p>
          )}
        </Card>
      )}

      {r.status === "done" && (isOwner || isTaker) && (
        <Card className="space-y-3 text-center">
          <p className="text-sm">この依頼は完了し、報酬が支払われました。</p>
          {myRating ? (
            <p className="text-sm text-stone-500">評価しました（{myRating.good ? "👍 よかった" : "👎 よくなかった"}）</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-bold">相手を評価してください</p>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => run(s.rate(r.id, true))}>
                  👍 よかった
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => run(s.rate(r.id, false))}>
                  👎 よくなかった
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
      {r.status === "cancelled" && (
        <p className="text-center text-sm text-stone-500">
          この依頼は終了しました{r.noShow ? "（引き受けた人が期限までに対応しなかったため取り消し）" : ""}。
        </p>
      )}
    </div>
  );
}

function Person({ userId, label }: { userId: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar userId={userId} />
      <div className="min-w-0 flex-1 text-sm">
        <UserName userId={userId} />
        <div className="text-xs text-stone-400">{label}</div>
      </div>
      <TradeBadge userId={userId} compact />
    </div>
  );
}
