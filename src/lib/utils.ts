export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** LINE アイコンの代わりに使う、名前から作る丸アイコン */
export function initialAvatar(name: string, hue: number) {
  const ch = [...(name.trim() || "?")][0];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,62%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},70%,48%)"/></linearGradient></defs><rect width="96" height="96" fill="url(#g)"/><text x="48" y="62" font-size="42" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700">${ch}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const hueOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

export const pei = (n: number) => `${n.toLocaleString("ja-JP")} ぺい`;

/** 画像ファイルを縮小して data URL にする（localStorage を圧迫しないため） */
export function resizeImage(file: File, maxSize: number, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした"));
    };
    img.src = url;
  });
}

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** LINE の友だち追加画面を開く URL */
export const lineAddUrl = (lineId: string) => `https://line.me/R/ti/p/~${encodeURIComponent(lineId)}`;

export const normalize = (s: string) => s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
