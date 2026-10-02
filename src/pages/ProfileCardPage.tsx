import { useRef, useState } from "react";
import { useMe, useStore } from "../lib/store";
import type { CardTheme } from "../lib/types";
import { PageHeader } from "../components/Layout";
import { BusinessCard, ProfileCard, THEMES } from "../components/ProfileCard";
import { Button } from "../components/ui";

type Kind = "profile" | "business";

export default function ProfileCardPage() {
  const me = useMe()!;
  const updateProfile = useStore((s) => s.updateProfile);
  const ref = useRef<HTMLDivElement>(null);
  const [kind, setKind] = useState<Kind>("profile");
  const [busy, setBusy] = useState(false);

  // PDF・画像化のライブラリは重いので、保存するときに読み込む
  const render = async () => (await import("html-to-image")).toPng(ref.current!, { pixelRatio: 3, cacheBust: true });

  const savePdf = async () => {
    setBusy(true);
    try {
      const el = ref.current!;
      // PDF は JPEG で埋め込んで軽くする（角の透明部分は白で埋める）
      const jpg = await (await import("html-to-image")).toJpeg(el, { pixelRatio: 2.5, quality: 0.92, backgroundColor: "#ffffff", cacheBust: true });
      const { jsPDF } = await import("jspdf");
      // 名刺は 91×55mm、プロフカードは幅 100mm で縦は比率どおり
      const w = kind === "business" ? 91 : 100;
      const h = kind === "business" ? 55 : (el.offsetHeight / el.offsetWidth) * w;
      const pdf = new jsPDF({ unit: "mm", format: [w, h], orientation: w > h ? "landscape" : "portrait" });
      pdf.addImage(jpg, "JPEG", 0, 0, w, h);
      pdf.save(`${me.name}_${kind === "business" ? "名刺" : "プロフカード"}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  const savePng = async () => {
    setBusy(true);
    try {
      const a = document.createElement("a");
      a.href = await render();
      a.download = `${me.name}_${kind === "business" ? "名刺" : "プロフカード"}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="プロフカード" back />
      <div className="flex gap-1 rounded-xl bg-stone-200/60 p-1">
        {(
          [
            ["profile", "プロフカード"],
            ["business", "名刺"],
          ] as [Kind, string][]
        ).map(([k, label]) => (
          <button key={k} onClick={() => setKind(k)} className={`flex-1 rounded-lg py-1.5 text-sm font-bold ${kind === k ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {(Object.keys(THEMES) as CardTheme[]).map((k) => (
          <button
            key={k}
            onClick={() => updateProfile({ cardTheme: k })}
            className={`flex-1 rounded-xl py-2 text-xs font-bold ring-2 ${me.profile.cardTheme === k ? "ring-teal-700" : "ring-transparent"}`}
            style={{ background: THEMES[k].bg, color: THEMES[k].ink }}
          >
            {THEMES[k].name}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="mx-auto w-fit">{kind === "profile" ? <ProfileCard ref={ref} user={me} /> : <BusinessCard ref={ref} user={me} />}</div>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={busy} onClick={savePdf}>
          PDF で保存
        </Button>
        <Button variant="ghost" disabled={busy} onClick={savePng}>
          画像で保存
        </Button>
      </div>
      <p className="text-xs text-stone-500">カードの内容は「プロフィールを編集」で書き換えられます。書いていない項目はカードに出ません。</p>
    </div>
  );
}
