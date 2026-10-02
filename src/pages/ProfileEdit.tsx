import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMe, useStore } from "../lib/store";
import type { LifeEvent, Profile } from "../lib/types";
import { resizeImage, uid } from "../lib/utils";
import { PageHeader } from "../components/Layout";
import { Button, Card, Field, inputCls } from "../components/ui";

const TEXT_FIELDS: [keyof Profile, string, string?][] = [
  ["furigana", "ふりがな"],
  ["faculty", "学部・学科"],
  ["grade", "学年"],
  ["hometown", "出身地"],
  ["lineId", "LINE ID", "依頼が成立したとき相手が友だち追加に使います"],
  ["hobbies", "趣味"],
  ["favorite", "好きなもの"],
  ["clubs", "部活・サークル"],
  ["skills", "資格・スキル"],
  ["message", "ひとこと"],
];
const LONG_FIELDS: [keyof Profile, string, string][] = [
  ["gakuchika", "学生時代に力を入れたこと", "就活でよく聞かれます"],
  ["strengths", "長所・短所", ""],
  ["future", "将来やりたいこと・志望業界", ""],
];

export default function ProfileEdit() {
  const me = useMe()!;
  const updateMe = useStore((s) => s.updateMe);
  const updateProfile = useStore((s) => s.updateProfile);
  const navigate = useNavigate();
  const [name, setName] = useState(me.name);
  const [avatar, setAvatar] = useState(me.avatar);
  const [p, setP] = useState<Profile>(me.profile);

  const set = (k: keyof Profile, v: string) => setP((x) => ({ ...x, [k]: v }));
  const setLife = (life: LifeEvent[]) => setP((x) => ({ ...x, life }));

  const save = () => {
    updateMe({ name: name.trim() || me.name, avatar });
    updateProfile(p);
    navigate("/me");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="プロフィール編集" back />
      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <img src={avatar} alt="" className="h-20 w-20 rounded-full object-cover" />
          <div className="space-y-1">
            <label className="block cursor-pointer text-sm font-bold text-teal-700">
              画像を変更
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setAvatar(await resizeImage(f, 320));
                }}
              />
            </label>
            <p className="text-xs text-stone-500">最初は LINE のアイコンが使われます</p>
          </div>
        </div>
        <Field label="名前">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="学籍番号" hint="学籍番号は変更できません">
          <input className={`${inputCls} bg-stone-100`} value={me.studentId} disabled />
        </Field>
        <Field label="誕生日">
          <input type="date" className={inputCls} value={p.birthday} onChange={(e) => set("birthday", e.target.value)} />
        </Field>
        {TEXT_FIELDS.map(([k, label, hint]) => (
          <Field key={k} label={label} hint={hint}>
            <input className={inputCls} value={p[k] as string} onChange={(e) => set(k, e.target.value)} />
          </Field>
        ))}
        {LONG_FIELDS.map(([k, label, hint]) => (
          <Field key={k} label={label} hint={hint || undefined}>
            <textarea className={`${inputCls} h-24`} value={p[k] as string} onChange={(e) => set(k, e.target.value)} />
          </Field>
        ))}
      </Card>

      <Card>
        <h2 className="mb-1 font-bold">人生史</h2>
        <p className="mb-3 text-xs text-stone-500">生まれてから今までの出来事を、年と一緒に書いていきましょう</p>
        <ul className="space-y-2">
          {p.life.map((e, i) => (
            <li key={e.id} className="flex gap-2">
              <input
                className={`${inputCls} w-24 shrink-0`}
                value={e.year}
                placeholder="2020"
                onChange={(ev) => setLife(p.life.map((x, j) => (j === i ? { ...x, year: ev.target.value } : x)))}
              />
              <input
                className={inputCls}
                value={e.text}
                placeholder="できごと"
                onChange={(ev) => setLife(p.life.map((x, j) => (j === i ? { ...x, text: ev.target.value } : x)))}
              />
              <button className="px-1 text-rose-500" onClick={() => setLife(p.life.filter((_, j) => j !== i))} aria-label="削除">
                ×
              </button>
            </li>
          ))}
        </ul>
        <button className="mt-3 text-sm font-bold text-teal-700" onClick={() => setLife([...p.life, { id: uid(), year: "", text: "" }])}>
          ＋ できごとを追加
        </button>
      </Card>

      <Button className="w-full py-3" onClick={save}>
        保存する
      </Button>
    </div>
  );
}
