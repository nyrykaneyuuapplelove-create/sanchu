import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { DAYS } from "../lib/time";
import { resizeImage } from "../lib/utils";
import { PageHeader } from "../components/Layout";
import { Button, Card, inputCls } from "../components/ui";

interface Row {
  name: string;
  teacher: string;
  day: number;
  period: number;
  room: string;
}

/** API キーがない環境でも流れを試せるように用意したサンプルの読み取り結果 */
const SAMPLE: Row[] = [
  { name: "線形代数学2", teacher: "小林 修", day: 0, period: 1, room: "1号館 201" },
  { name: "解析学2", teacher: "中村 智子", day: 0, period: 3, room: "1号館 305" },
  { name: "確率統計", teacher: "吉田 誠", day: 2, period: 2, room: "2号館 101" },
  { name: "現代社会論", teacher: "岡田 涼", day: 4, period: 2, room: "3号館 301" },
];

export default function TimetableImport() {
  const importTimetable = useStore((s) => s.importTimetable);
  const navigate = useNavigate();
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ created: number; enrolled: number } | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setRows(null);
    setLoading(true);
    try {
      // 送信サイズを抑えるため縮小してから送る
      const dataUrl = await resizeImage(file, 1800, 0.9);
      setPreview(dataUrl);
      const res = await fetch("/api/parse-timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl.split(",")[1], mediaType: "image/jpeg" }),
      });
      const json = await res.json().catch(() => ({ error: "サーバーから応答がありません" }));
      if (!res.ok) throw new Error(json.error ?? "読み取りに失敗しました");
      if (json.courses.length === 0) throw new Error("授業を読み取れませんでした。UNIPA の時間割一覧画面のスクショか確認してください");
      setRows(json.courses);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r!.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  if (result) {
    return (
      <div>
        <PageHeader title="履修登録" />
        <Card className="py-8 text-center">
          <div className="mb-2 text-5xl">🎓</div>
          <p className="text-lg font-black">履修登録が完了しました</p>
          <p className="mt-2 text-sm text-stone-600">
            {result.enrolled} 件の授業を登録しました
            {result.created > 0 && `（うち ${result.created} 件はさんちゅで初めての授業なので、新しく作成しました）`}
          </p>
          <Button className="mt-6" onClick={() => navigate("/timetable")}>
            時間割を見る
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="スクショで履修登録" back />
      <Card>
        <p className="mb-3 text-sm text-stone-600">
          UNIPA の<b>時間割一覧画面</b>のスクリーンショットを選ぶと、授業名・曜日・時限・教室を読み取って履修登録します。
        </p>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/50 p-6 text-teal-800">
          {preview ? <img src={preview} alt="" className="max-h-60 rounded-lg" /> : <span className="text-4xl">🖼️</span>}
          <span className="text-sm font-bold">{preview ? "別の画像を選ぶ" : "スクショを選ぶ"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {loading && <p className="mt-3 animate-pulse text-center text-sm font-bold text-teal-700">読み取り中…（数十秒かかることがあります）</p>}
        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
            <button className="mt-2 block text-xs font-bold underline" onClick={() => setRows(SAMPLE)}>
              デモ用のサンプル結果で続ける
            </button>
          </div>
        )}
        {!rows && !loading && !error && (
          <button className="mt-3 text-xs font-bold text-stone-400 underline" onClick={() => setRows(SAMPLE)}>
            画像なしでデモ用のサンプル結果を使う
          </button>
        )}
      </Card>

      {rows && (
        <Card>
          <p className="mb-3 text-sm font-bold">読み取り結果を確認してください（直せます）</p>
          <ul className="space-y-3">
            {rows.map((r, i) => (
              <li key={i} className="space-y-2 rounded-xl bg-stone-50 p-3">
                <div className="flex gap-2">
                  <select className={`${inputCls} w-auto`} value={r.day} onChange={(e) => update(i, { day: Number(e.target.value) })}>
                    {DAYS.map((d, di) => (
                      <option key={d} value={di}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select className={`${inputCls} w-auto`} value={r.period} onChange={(e) => update(i, { period: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                      <option key={p} value={p}>
                        {p}限
                      </option>
                    ))}
                  </select>
                  <button className="ml-auto text-sm text-rose-600" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                    削除
                  </button>
                </div>
                <input className={inputCls} value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="授業名" />
                <div className="flex gap-2">
                  <input className={inputCls} value={r.teacher} onChange={(e) => update(i, { teacher: e.target.value })} placeholder="教員" />
                  <input className={inputCls} value={r.room} onChange={(e) => update(i, { room: e.target.value })} placeholder="教室" />
                </div>
              </li>
            ))}
          </ul>
          <Button className="mt-4 w-full" disabled={rows.length === 0} onClick={() => setResult(importTimetable(rows.filter((r) => r.name.trim())))}>
            この内容で履修登録する
          </Button>
        </Card>
      )}
    </div>
  );
}
