import { isBlocked, useStore, useUser } from "../lib/store";
import type { ID } from "../lib/types";
import { lineAddUrl } from "../lib/utils";
import { useSendMoney } from "./SendMoney";
import { Avatar } from "./ui";

/** 依頼成立後に出す「相手を LINE で追加」「送金」 */
export function PartnerActions({ partnerId }: { partnerId: ID }) {
  const partner = useUser(partnerId);
  const blocked = useStore((s) => (s.me ? isBlocked(s, s.me, partnerId) : false));
  const sendMoney = useSendMoney();
  if (!partner) return null;
  if (blocked) return <p className="rounded-xl bg-stone-50 p-2.5 text-xs text-stone-500">ブロック中の相手です</p>;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2.5">
        <Avatar userId={partner.id} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{partner.name}</span>
          <span className="block text-[11px] text-stone-500">学籍番号 {partner.studentId}</span>
        </span>
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
      <p className="px-1 text-[10.5px] leading-snug text-stone-400">
        LINE で現金・電子マネーのやりとりを持ちかけられたり、課題の代行を頼まれたりしたら、相手のプロフィールから通報してください。
      </p>
    </div>
  );
}
