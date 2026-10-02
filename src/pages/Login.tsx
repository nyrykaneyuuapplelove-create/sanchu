import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { hueOf, initialAvatar } from "../lib/utils";
import { Button, Field, inputCls } from "../components/ui";

/**
 * LINE ログイン（プロトタイプではモック）。
 * 本番では LINE Login / LIFF で表示名とアイコン URL を受け取り、ここの lineProfile に入れる。
 */
export default function Login() {
  const users = useStore((s) => s.users);
  const loginAs = useStore((s) => s.loginAs);
  const register = useStore((s) => s.register);
  const navigate = useNavigate();

  const [lineProfile, setLineProfile] = useState<{ name: string; avatar: string } | null>(null);
  const [lineName, setLineName] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [lineId, setLineId] = useState("");
  const [error, setError] = useState("");

  const demo = users.slice(0, 4);

  const connectLine = () => {
    const n = lineName.trim() || "新入生";
    setLineProfile({ name: n, avatar: initialAvatar(n, hueOf(n)) });
    setName(n);
  };

  const submit = () => {
    if (!name.trim()) return setError("名前を入力してください");
    if (!/^\d{6,10}$/.test(studentId)) return setError("学籍番号は数字 6〜10 桁で入力してください");
    const err = register({ name: name.trim(), studentId, avatar: lineProfile!.avatar, lineId: lineId.trim() });
    if (err) return setError(err);
    navigate("/timetable/import");
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-gradient-to-b from-teal-700 to-teal-900 px-6 py-12 text-white">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-4xl font-black text-teal-800 shadow-lg">さ</div>
        <h1 className="text-3xl font-black">さんちゅ</h1>
        <p className="mt-2 text-sm text-teal-100">授業の情報を、同じ授業の仲間と共有しよう</p>
      </div>

      <div className="rounded-3xl bg-white p-5 text-stone-900 shadow-xl">
        {!lineProfile ? (
          <div className="space-y-4">
            <Field label="LINE の表示名（デモ用）" hint="本番では LINE ログインで自動的に取得します">
              <input className={inputCls} value={lineName} onChange={(e) => setLineName(e.target.value)} placeholder="例: ひなた" />
            </Field>
            <Button variant="line" className="w-full py-3 text-base" onClick={connectLine}>
              LINE でログイン
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={lineProfile.avatar} alt="" className="h-14 w-14 rounded-full" />
              <div>
                <div className="text-xs text-stone-500">LINE と連携しました</div>
                <div className="font-bold">{lineProfile.name}</div>
              </div>
            </div>
            <Field label="名前">
              <input className={inputCls} value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="学籍番号" hint="送金のときに相手を探すのに使います">
              <input className={inputCls} inputMode="numeric" value={studentId} onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="LINE ID（任意）" hint="依頼が成立したとき、相手が友だち追加するのに使います">
              <input className={inputCls} value={lineId} onChange={(e) => setLineId(e.target.value)} />
            </Field>
            {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
            <Button className="w-full py-3 text-base" onClick={submit}>
              アカウントと口座を作る
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <p className="mb-3 text-center text-xs text-teal-100">デモの学生として試す</p>
        <div className="grid grid-cols-4 gap-3">
          {demo.map((u) => (
            <button key={u.id} onClick={() => loginAs(u.id)} className="flex flex-col items-center gap-1 text-xs">
              <img src={u.avatar} alt="" className="h-12 w-12 rounded-full ring-2 ring-white/60" />
              {u.name.split(" ")[1] ?? u.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
