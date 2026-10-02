import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import type { HelpRequest, RequestKind } from "../lib/types";
import { fmtDateTime, relative } from "../lib/time";
import { PageHeader } from "../components/Layout";
import { Avatar, Card, Empty, Pill, useNow } from "../components/ui";

export const REQUEST_KINDS: Record<RequestKind, string> = {
  question: "質問・解説",
  study: "勉強会",
  tutor: "教えて（チューター）",
  other: "その他",
};

type Sort = "price" | "due" | "new";

export default function Board() {
  const now = useNow();
  const requests = useStore((s) => s.requests);
  const courses = useStore((s) => s.courses);
  const me = useStore((s) => s.me)!;
  const [sort, setSort] = useState<Sort>("due");
  const [kind, setKind] = useState<RequestKind | "all">("all");
  const [mineOnly, setMineOnly] = useState(false);

  const list = useMemo(() => {
    const open = requests.filter((r) =>
      mineOnly
        ? r.userId === me || r.acceptedBy === me
        : r.status === "open" && new Date(r.listUntil) > now && (kind === "all" || r.kind === kind),
    );
    const by: Record<Sort, (a: HelpRequest, b: HelpRequest) => number> = {
      price: (a, b) => b.price - a.price,
      due: (a, b) => a.dueAt.localeCompare(b.dueAt),
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return [...open].sort(by[sort]);
  }, [requests, now, kind, sort, mineOnly, me]);

  return (
    <div className="space-y-3">
      <PageHeader
        title="依頼板"
        right={
          <Link to="/board/new" className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white">
            ＋ 依頼する
          </Link>
        }
      />
      <p className="rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
        わからないところの解説、勉強会、チューターをぺいでお願いできます。<b>課題の代行や、答え・成果物の受け渡しの依頼は禁止</b>です。
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip on={!mineOnly && kind === "all"} onClick={() => (setMineOnly(false), setKind("all"))}>
          すべて
        </Chip>
        {(Object.keys(REQUEST_KINDS) as RequestKind[]).map((k) => (
          <Chip key={k} on={!mineOnly && kind === k} onClick={() => (setMineOnly(false), setKind(k))}>
            {REQUEST_KINDS[k]}
          </Chip>
        ))}
        <Chip on={mineOnly} onClick={() => setMineOnly(true)}>
          自分の依頼・引き受け
        </Chip>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-stone-500">並び替え:</span>
        {(
          [
            ["due", "期限が近い順"],
            ["price", "価格が高い順"],
            ["new", "新しい順"],
          ] as [Sort, string][]
        ).map(([k, label]) => (
          <button key={k} onClick={() => setSort(k)} className={`rounded-full px-2.5 py-1 font-bold ${sort === k ? "bg-stone-800 text-white" : "text-stone-500"}`}>
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty>依頼はありません</Empty>
        </Card>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => (
            <li key={r.id}>
              <Link to={`/board/${r.id}`} className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70">
                <div className="flex items-start gap-3">
                  <Avatar userId={r.userId} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Pill tone="sky">{REQUEST_KINDS[r.kind]}</Pill>
                      {r.courseId && <span className="truncate text-[11px] font-bold text-teal-700">{courses.find((c) => c.id === r.courseId)?.name}</span>}
                      {r.status !== "open" && <Pill tone={r.status === "accepted" ? "amber" : "stone"}>{STATUS[r.status]}</Pill>}
                    </div>
                    <div className="font-bold leading-snug">{r.title}</div>
                    <div className="mt-1 text-[11px] text-stone-500">
                      希望期限 {fmtDateTime(r.dueAt)}　掲載 {relative(r.listUntil, now)}まで
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] font-bold text-stone-400">即決</div>
                    <div className="text-lg font-black text-teal-700">{r.price.toLocaleString()}</div>
                    <div className="text-[10px] text-stone-400">ぺい</div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="pt-2 text-center text-[11px] text-stone-400">ぺいは学内のお礼用ポイントです。現金との交換はできません。</p>
    </div>
  );
}

export const STATUS = { open: "募集中", accepted: "成立", done: "完了", cancelled: "取り下げ" } as const;

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${on ? "bg-teal-700 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"}`}>
      {children}
    </button>
  );
}
