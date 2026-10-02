import { useState } from "react";
import { isRestricted, tradeStats, useStore } from "../lib/store";
import { REPORT_REASONS } from "../lib/moderation";
import type { ID, ReportReason, ReportTarget } from "../lib/types";
import { Button, Modal } from "./ui";

const TARGET_LABEL: Record<ReportTarget, string> = {
  post: "書き込み",
  live: "連絡",
  request: "依頼",
  assignment: "課題",
  user: "ユーザー",
};

/** 「…」メニュー：通報・ブロック・（自分のものなら）削除 */
export function ModMenu({
  type,
  id,
  owner,
  onDelete,
  className = "",
}: {
  type: ReportTarget;
  id: ID;
  owner: ID;
  onDelete?: () => void;
  className?: string;
}) {
  const me = useStore((s) => s.me);
  const blocked = useStore((s) => (s.me ? (s.blocks[s.me] ?? []).includes(owner) : false));
  const report = useStore((s) => s.report);
  const toggleBlock = useStore((s) => s.toggleBlock);
  const ownerName = useStore((s) => s.users.find((u) => u.id === owner)?.name ?? "");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"menu" | "report" | "done">("menu");
  const [msg, setMsg] = useState("");
  const mine = owner === me;
  if (mine && !onDelete) return null;

  const close = () => {
    setOpen(false);
    setStep("menu");
    setMsg("");
  };

  return (
    <>
      <button
        className={`shrink-0 rounded-full px-1.5 text-lg leading-none text-stone-400 hover:bg-stone-100 ${className}`}
        aria-label="メニュー"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        …
      </button>
      <Modal open={open} onClose={close} title={step === "report" ? `${TARGET_LABEL[type]}を通報` : "メニュー"}>
        <div onClick={(e) => e.stopPropagation()}>
          {step === "menu" && (
            <div className="space-y-2">
              {mine ? (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => {
                    if (confirm("削除します。よろしいですか？")) {
                      onDelete?.();
                      close();
                    }
                  }}
                >
                  削除する
                </Button>
              ) : (
                <>
                  <Button variant="ghost" className="w-full" onClick={() => setStep("report")}>
                    🚩 通報する
                  </Button>
                  <Button
                    variant={blocked ? "ghost" : "danger"}
                    className="w-full"
                    onClick={() => {
                      toggleBlock(owner);
                      setMsg(blocked ? `${ownerName}さんのブロックを解除しました` : `${ownerName}さんをブロックしました。書き込みや依頼が見えなくなり、送金や依頼のやりとりもできなくなります`);
                      setStep("done");
                    }}
                  >
                    {blocked ? `${ownerName}さんのブロックを解除` : `🚫 ${ownerName}さんをブロック`}
                  </Button>
                </>
              )}
            </div>
          )}
          {step === "report" && (
            <div className="space-y-2">
              <p className="mb-2 text-xs text-stone-500">3人から通報されると自動で非表示になります。いたずらの通報が続くと、あなたのアカウントが制限されることがあります。</p>
              {(Object.keys(REPORT_REASONS) as ReportReason[]).map((r) => (
                <button
                  key={r}
                  className="w-full rounded-xl bg-stone-50 p-3 text-left text-sm font-semibold hover:bg-stone-100"
                  onClick={() => {
                    const err = report(type, id, owner, r);
                    setMsg(err ?? "通報しました。ご協力ありがとうございます");
                    setStep("done");
                  }}
                >
                  {REPORT_REASONS[r]}
                </button>
              ))}
            </div>
          )}
          {step === "done" && (
            <div className="space-y-4 py-2 text-center">
              <p className="text-sm">{msg}</p>
              <Button className="w-full" onClick={close}>
                閉じる
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

/** 通報で非表示になった自分の投稿に付ける注意書き */
export function HiddenNote({ text = "通報が集まったため、ほかの人には見えていません" }: { text?: string }) {
  return <p className="mt-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">🚩 {text}</p>;
}

/** 取引の評価（完了数・👍・👎・途中放棄） */
export function TradeBadge({ userId, compact = false }: { userId: ID; compact?: boolean }) {
  const requests = useStore((s) => s.requests);
  const ratings = useStore((s) => s.ratings);
  const st = tradeStats({ requests, ratings }, userId);
  const warn = st.noShow > 0 || st.bad > st.good;
  if (compact) {
    return (
      <span className={`text-[11px] ${warn ? "font-bold text-rose-600" : "text-stone-500"}`}>
        取引{st.done} 👍{st.good}
        {st.bad > 0 && ` 👎${st.bad}`}
        {st.noShow > 0 && ` ⚠放棄${st.noShow}`}
      </span>
    );
  }
  return (
    <div className={`grid grid-cols-4 gap-1 rounded-xl p-2 text-center ${warn ? "bg-rose-50" : "bg-stone-50"}`}>
      {[
        ["完了", st.done],
        ["👍", st.good],
        ["👎", st.bad],
        ["途中放棄", st.noShow],
      ].map(([k, v]) => (
        <div key={k}>
          <div className="text-[10px] text-stone-500">{k}</div>
          <div className={`font-black ${k === "途中放棄" && Number(v) > 0 ? "text-rose-600" : ""}`}>{v}</div>
        </div>
      ))}
    </div>
  );
}

/** 制限中のときに画面上部に出す帯 */
export function RestrictedBanner() {
  const restricted = useStore((s) => (s.me ? isRestricted(s, s.me) : false));
  if (!restricted) return null;
  return (
    <div className="mb-3 rounded-xl bg-rose-600 p-3 text-xs font-bold text-white">
      通報が多く集まったため、このアカウントは書き込み・依頼・送金が制限されています。
    </div>
  );
}
