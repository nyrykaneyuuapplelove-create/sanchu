import { useUser } from "../lib/store";
import type { ID } from "../lib/types";
import { lineAddUrl } from "../lib/utils";
import { useSendMoney } from "./SendMoney";
import { Avatar } from "./ui";

/** 依頼成立後に出す「相手を LINE で追加」「送金」 */
export function PartnerActions({ partnerId }: { partnerId: ID }) {
  const partner = useUser(partnerId);
  const sendMoney = useSendMoney();
  if (!partner) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2.5">
      <Avatar userId={partner.id} size={36} />
      <span className="min-w-0 flex-1 truncate text-sm font-bold">{partner.name}</span>
      {partner.profile.lineId ? (
        <a
          href={lineAddUrl(partner.profile.lineId)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-[#06C755] px-3 py-2 text-xs font-bold text-white"
          onClick={(e) => e.stopPropagation()}
        >
          LINE で追加
        </a>
      ) : (
        <span className="text-[11px] text-stone-400">LINE ID 未設定</span>
      )}
      <button
        className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white"
        onClick={(e) => {
          e.stopPropagation();
          sendMoney({ to: partner.id });
        }}
      >
        送金
      </button>
    </div>
  );
}
