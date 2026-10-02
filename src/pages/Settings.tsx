import { useStore } from "../lib/store";
import { PERIODS, fmtMin } from "../lib/time";
import { PageHeader } from "../components/Layout";
import { Button, Card, useNow } from "../components/ui";

export default function Settings() {
  const now = useNow();
  const users = useStore((s) => s.users);
  const me = useStore((s) => s.me);
  const offset = useStore((s) => s.clockOffsetMin);
  const setOffset = useStore((s) => s.setClockOffset);
  const loginAs = useStore((s) => s.loginAs);
  const logout = useStore((s) => s.logout);
  const resetDemo = useStore((s) => s.resetDemo);

  // 時計を「次の平日の指定時限の途中」に合わせる
  const jumpToPeriod = (day: number, period: number) => {
    const target = new Date();
    const diffDays = (day - ((target.getDay() + 6) % 7) + 7) % 7;
    target.setDate(target.getDate() + diffDays);
    const m = PERIODS[period - 1].start + 20;
    target.setHours(Math.floor(m / 60), m % 60, 0, 0);
    setOffset(Math.round((target.getTime() - Date.now()) / 60000));
  };

  return (
    <div className="space-y-4">
      <PageHeader title="設定" back />
      <Card className="space-y-3">
        <h2 className="font-bold">デモ用の時計</h2>
        <p className="text-sm text-stone-600">
          いまの時刻（アプリ内）: <b>{now.toLocaleString("ja-JP")}</b>
          {offset !== 0 && <span className="ml-1 text-xs text-amber-700">（ずらし中）</span>}
        </p>
        <p className="text-xs text-stone-500">授業中にしか使えない機能（授業の連絡）を試すときに使います。</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => jumpToPeriod(0, 1)}>
            月曜1限（{fmtMin(PERIODS[0].start)}〜）
          </Button>
          <Button variant="ghost" onClick={() => jumpToPeriod(2, 2)}>
            水曜2限
          </Button>
          <Button variant="ghost" onClick={() => setOffset(0)}>
            現在時刻に戻す
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">別の学生に切り替える（デモ用）</h2>
        <p className="text-xs text-stone-500">依頼を引き受ける側・送金を受け取る側を試すときに使います。</p>
        <div className="grid grid-cols-4 gap-3">
          {users.map((u) => (
            <button key={u.id} onClick={() => loginAs(u.id)} className={`flex flex-col items-center gap-1 text-[11px] ${u.id === me ? "font-black text-teal-700" : ""}`}>
              <img src={u.avatar} alt="" className={`h-11 w-11 rounded-full object-cover ${u.id === me ? "ring-2 ring-teal-700" : ""}`} />
              {u.name.split(" ").at(-1)}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-2">
        <Button variant="ghost" className="w-full" onClick={logout}>
          ログアウト
        </Button>
        <Button
          variant="danger"
          className="w-full"
          onClick={() => {
            if (confirm("このブラウザに保存されたデータをすべて消して、デモの最初の状態に戻します。よろしいですか？")) resetDemo();
          }}
        >
          デモデータを初期化
        </Button>
      </Card>
    </div>
  );
}
