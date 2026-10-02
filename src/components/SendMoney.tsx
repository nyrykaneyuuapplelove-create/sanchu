import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { balanceOf, isBlocked, useStore } from "../lib/store";
import { LIMITS } from "../lib/moderation";
import type { ID } from "../lib/types";
import { pei } from "../lib/utils";
import { Button, Field, Modal, inputCls } from "./ui";

interface Opts {
  to?: ID;
  amount?: number;
  memo?: string;
}

const Ctx = createContext<(o?: Opts) => void>(() => {});

/** どの画面からでも送金ダイアログを開ける */
export const useSendMoney = () => useContext(Ctx);

export function SendMoneyProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<Opts | null>(null);
  return (
    <Ctx.Provider value={(o) => setOpts(o ?? {})}>
      {children}
      {opts && <SendMoneyDialog key={JSON.stringify(opts)} initial={opts} onClose={() => setOpts(null)} />}
    </Ctx.Provider>
  );
}

function SendMoneyDialog({ initial, onClose }: { initial: Opts; onClose: () => void }) {
  const users = useStore((s) => s.users);
  const me = useStore((s) => s.me);
  const tx = useStore((s) => s.tx);
  const send = useStore((s) => s.send);
  const blocks = useStore((s) => s.blocks);
  const [confirming, setConfirming] = useState(false);
  const [query, setQuery] = useState("");
  const [to, setTo] = useState<ID | null>(initial.to ?? null);
  const [amount, setAmount] = useState(initial.amount ? String(initial.amount) : "");
  const [memo, setMemo] = useState(initial.memo ?? "");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const balance = me ? balanceOf(tx, me) : 0;
  const hits = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    // 学籍番号の一部だけで全員を一覧できないよう、4桁以上で検索する
    if (q.length < 4) return [];
    return users.filter((u) => u.id !== me && u.studentId.startsWith(q) && !isBlocked({ blocks }, me!, u.id)).slice(0, 6);
  }, [query, users, me, blocks]);
  const target = users.find((u) => u.id === to);

  const submit = () => {
    if (!to) return;
    const err = send(to, Number(amount), memo.trim());
    if (err) {
      setError(err);
      setConfirming(false);
    } else setDone(true);
  };

  return (
    <Modal open onClose={onClose} title="ぺいを送る">
      {done ? (
        <div className="py-6 text-center">
          <div className="mb-2 text-4xl">✓</div>
          <p className="font-bold">{target?.name}さんに {pei(Number(amount))} を送りました</p>
          <Button className="mt-6 w-full" onClick={onClose}>
            閉じる
          </Button>
        </div>
      ) : confirming && target ? (
        <div className="space-y-4 text-center">
          <p className="text-sm font-bold">この人に送ります。間違いないですか？</p>
          <img src={target.avatar} alt="" className="mx-auto h-20 w-20 rounded-full object-cover" />
          <div>
            <div className="text-xl font-black">{target.name}</div>
            <div className="text-sm text-stone-600">学籍番号 {target.studentId}</div>
            <div className="text-xs text-stone-500">{target.profile.faculty}</div>
          </div>
          <div className="text-3xl font-black text-teal-700">{pei(Number(amount))}</div>
          {memo && <p className="text-sm text-stone-600">「{memo}」</p>}
          <p className="rounded-xl bg-amber-50 p-2 text-left text-xs text-amber-900">
            送ったぺいは取り消せません。同じ名前の別人やなりすましに注意して、学籍番号を必ず確かめてください。ぺいを現金で買う・売る話は詐欺です。
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              戻る
            </Button>
            <Button className="flex-1" onClick={submit}>
              送金する
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            残高 {pei(balance)}　<span className="text-[11px]">（1日 {LIMITS.sendsPerDay} 回・{LIMITS.sendAmountPerDay.toLocaleString()} ぺいまで）</span>
          </p>
          {target ? (
            <div className="flex items-center gap-3 rounded-2xl bg-teal-50 p-3">
              <img src={target.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
              <div className="flex-1">
                <div className="font-bold">{target.name}</div>
                <div className="text-xs text-stone-500">
                  {target.studentId}　{target.profile.faculty}
                </div>
              </div>
              {!initial.to && (
                <button className="text-sm text-teal-700" onClick={() => setTo(null)}>
                  変更
                </button>
              )}
            </div>
          ) : (
            <Field label="送り先の学籍番号" hint="学籍番号を4桁以上入れると候補が出ます">
              <input
                className={inputCls}
                inputMode="numeric"
                placeholder="例: 4624002"
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
              />
              <ul className="mt-2 divide-y divide-stone-100">
                {hits.map((u) => (
                  <li key={u.id}>
                    <button className="flex w-full items-center gap-3 py-2 text-left" onClick={() => setTo(u.id)}>
                      <img src={u.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                      <span className="flex-1">
                        <span className="block font-semibold">{u.name}</span>
                        <span className="block text-xs text-stone-500">{u.studentId}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {query.trim() && hits.length === 0 && <li className="py-2 text-sm text-stone-400">見つかりません</li>}
              </ul>
            </Field>
          )}
          <Field label="金額（ぺい）">
            <input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="メモ（任意）">
            <input className={inputCls} value={memo} maxLength={60} onChange={(e) => setMemo(e.target.value)} placeholder="ノートのお礼 など" />
          </Field>
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <Button className="w-full" disabled={!to || !amount} onClick={() => (setError(""), setConfirming(true))}>
            確認へ
          </Button>
        </div>
      )}
    </Modal>
  );
}
