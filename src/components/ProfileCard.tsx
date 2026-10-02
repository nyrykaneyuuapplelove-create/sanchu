import { forwardRef } from "react";
import type { CardTheme, User } from "../lib/types";

export const THEMES: Record<CardTheme, { name: string; bg: string; accent: string; ink: string; sub: string; panel: string }> = {
  mint: { name: "ミント", bg: "linear-gradient(160deg,#ccfbf1 0%,#f0fdfa 45%,#fef9c3 100%)", accent: "#0f766e", ink: "#134e4a", sub: "#5f7d7a", panel: "rgba(255,255,255,.72)" },
  sunset: { name: "サンセット", bg: "linear-gradient(160deg,#fed7aa 0%,#fecdd3 55%,#e9d5ff 100%)", accent: "#c2410c", ink: "#431407", sub: "#7c5a4d", panel: "rgba(255,255,255,.7)" },
  night: { name: "ナイト", bg: "linear-gradient(160deg,#1e1b4b 0%,#312e81 55%,#0f172a 100%)", accent: "#fbbf24", ink: "#f8fafc", sub: "#c7d2fe", panel: "rgba(255,255,255,.08)" },
  sakura: { name: "さくら", bg: "linear-gradient(160deg,#fce7f3 0%,#fff1f2 50%,#fdf2f8 100%)", accent: "#be185d", ink: "#500724", sub: "#86506a", panel: "rgba(255,255,255,.75)" },
};

const age = (birthday: string) => {
  if (!birthday) return "";
  const b = new Date(birthday);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return `${a}歳`;
};

function Item({ label, value, t }: { label: string; value: string; t: (typeof THEMES)[CardTheme] }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ color: t.accent, fontSize: 9.5, fontWeight: 800, letterSpacing: ".08em" }}>{label}</div>
      <div style={{ color: t.ink, fontSize: 12, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{value}</div>
    </div>
  );
}

/** 昔のプロフ帳風の縦長カード（360×約540px で描き、PDF にそのまま書き出す） */
export const ProfileCard = forwardRef<HTMLDivElement, { user: User }>(function ProfileCard({ user }, ref) {
  const p = user.profile;
  const t = THEMES[p.cardTheme];
  return (
    <div
      ref={ref}
      style={{ width: 360, background: t.bg, color: t.ink, fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif" }}
      className="relative overflow-hidden rounded-[28px] p-6"
    >
      {/* 飾りの丸 */}
      <div style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: "50%", background: t.accent, opacity: 0.12 }} />
      <div style={{ position: "absolute", left: -30, bottom: 60, width: 90, height: 90, borderRadius: "50%", background: t.accent, opacity: 0.08 }} />

      <div style={{ color: t.accent, fontSize: 11, fontWeight: 900, letterSpacing: ".35em" }}>PROFILE ✦ CARD</div>
      <div className="mt-4 flex items-center gap-4">
        <img src={user.avatar} alt="" style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: `3px solid ${t.accent}` }} />
        <div className="min-w-0">
          {p.furigana && <div style={{ color: t.sub, fontSize: 10.5 }}>{p.furigana}</div>}
          <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.15 }}>{user.name}</div>
          <div style={{ color: t.sub, fontSize: 11.5, marginTop: 4 }}>
            {[p.faculty, p.grade].filter(Boolean).join(" ")}
          </div>
          <div style={{ color: t.sub, fontSize: 11 }}>
            {[p.birthday && `${p.birthday.replaceAll("-", ".")}（${age(p.birthday)}）`, p.hometown && `${p.hometown}出身`].filter(Boolean).join("　")}
          </div>
        </div>
      </div>

      {p.message && (
        <div style={{ marginTop: 14, background: t.accent, color: p.cardTheme === "night" ? "#1e1b4b" : "#fff", borderRadius: 14, padding: "8px 12px", fontSize: 12.5, fontWeight: 700 }}>
          💬 {p.message}
        </div>
      )}

      <div style={{ background: t.panel, borderRadius: 18, padding: 14, marginTop: 14 }} className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        <Item label="趣味" value={p.hobbies} t={t} />
        <Item label="好きなもの" value={p.favorite} t={t} />
        <Item label="部活・サークル" value={p.clubs} t={t} />
        <Item label="資格・スキル" value={p.skills} t={t} />
      </div>

      {(p.gakuchika || p.strengths || p.future) && (
        <div style={{ background: t.panel, borderRadius: 18, padding: 14, marginTop: 10 }} className="space-y-2.5">
          <Item label="力を入れたこと" value={p.gakuchika} t={t} />
          <Item label="長所・短所" value={p.strengths} t={t} />
          <Item label="将来やりたいこと" value={p.future} t={t} />
        </div>
      )}

      {p.life.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: t.accent, fontSize: 9.5, fontWeight: 800, letterSpacing: ".08em", marginBottom: 6 }}>人生史</div>
          <ol style={{ borderLeft: `2px solid ${t.accent}`, marginLeft: 4, paddingLeft: 12 }} className="space-y-1">
            {p.life.slice(0, 8).map((e) => (
              <li key={e.id} style={{ fontSize: 11.5, position: "relative" }}>
                <span style={{ position: "absolute", left: -17, top: 5, width: 8, height: 8, borderRadius: 4, background: t.accent }} />
                <b style={{ color: t.accent, marginRight: 6 }}>{e.year}</b>
                {e.text}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", color: t.sub, fontSize: 9.5 }}>
        <span>{p.lineId ? `LINE: ${p.lineId}` : ""}</span>
        <span style={{ fontWeight: 800 }}>さんちゅ</span>
      </div>
    </div>
  );
});

/** 名刺サイズ（91×55mm の比率）のカード */
export const BusinessCard = forwardRef<HTMLDivElement, { user: User }>(function BusinessCard({ user }, ref) {
  const p = user.profile;
  const t = THEMES[p.cardTheme];
  return (
    <div
      ref={ref}
      style={{ width: 455, height: 275, background: t.bg, color: t.ink, fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif" }}
      className="relative overflow-hidden rounded-2xl p-6"
    >
      <div style={{ position: "absolute", right: -50, bottom: -50, width: 200, height: 200, borderRadius: "50%", background: t.accent, opacity: 0.13 }} />
      <div style={{ color: t.accent, fontSize: 10, fontWeight: 900, letterSpacing: ".3em" }}>{p.faculty || "STUDENT"}</div>
      <div className="mt-5 flex items-center gap-4">
        <img src={user.avatar} alt="" style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", border: `3px solid ${t.accent}` }} />
        <div>
          {p.furigana && <div style={{ color: t.sub, fontSize: 11 }}>{p.furigana}</div>}
          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>{user.name}</div>
          <div style={{ color: t.sub, fontSize: 12, marginTop: 4 }}>{p.grade}</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 24, bottom: 22, fontSize: 11.5, lineHeight: 1.6 }}>
        {p.hobbies && <div>趣味　{p.hobbies}</div>}
        {p.future && <div>夢　{p.future}</div>}
        {p.lineId && <div style={{ color: t.sub }}>LINE　{p.lineId}</div>}
      </div>
    </div>
  );
});
