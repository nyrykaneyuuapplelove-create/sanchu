/**
 * 投稿内容のチェック。民度が低い前提で、すり抜けにくいように表記ゆれをそろえてから判定する。
 * ここはブラウザ側のチェックなので、本番ではサーバー側でも同じ判定をすること。
 */

/** 判定用に文字をそろえる：全角半角・カタカナ→ひらがな・小文字・空白や記号の除去・伸ばし棒と連続文字の圧縮 */
export function fold(text: string) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s\u200b-\u200d\ufeff・.,、。!！?？\-_~〜ー―‐*＊/\\|()（）「」『』【】[\]{}<>＜＞"'`^@#$%&+=:;]/g, "")
    .replace(/(.)\1{2,}/g, "$1$1");
}

interface Rule {
  kind: "cheat" | "attendance" | "abuse" | "privacy" | "money" | "spam";
  message: string;
  /** fold() 後の文字列に当てる */
  folded?: RegExp;
  /** 元の文字列（NFKC だけ）に当てる。電話番号やメルなど記号が意味を持つもの */
  raw?: RegExp;
  /** NFKC とカタカナ→ひらがなだけそろえた文字列（空白は残す）に当てる */
  kana?: RegExp;
}

const RULES: Rule[] = [
  {
    kind: "cheat",
    message: "課題の代行や、答え・成果物の受け渡しにあたる内容は書き込めません",
    folded:
      /代行|だいこう|代筆|だいひつ|代わりに(やって|といて|解いて|書いて|かいて|出して|だして|提出)|かわりに(やって|といて|かいて|だして)|答え(を)?(教えて|おしえて|送って|おくって|ちょうだい|見せて|みせて|売|うる|買|かう)|こたえ(おしえて|おくって|みせて|ちょうだい)|解答(を)?(送って|おくって|ちょうだい|見せて|みせて|売|買)|丸写し|まるうつし|写させ|うつさせ|(れぽと|レポト|課題|かだい|宿題|しゅくだい)(を)?(書いて|かいて|作って|つくって|やって|代わり|かわり|売|買|ください)|ごすとらいた/,
  },
  {
    kind: "attendance",
    message: "出席コードの共有や代返の依頼はできません",
    folded: /出席(こど|code|番号|ばんごう|ぱす|のこど)|しゅっせきこど|代返|だいへん|出席(とって|おねがい|頼|たの)|かわりに出席/,
  },
  {
    kind: "abuse",
    message: "人を傷つける言葉は書き込めません",
    folded:
      /死ね|氏ね|殺す|殺したい|消えろ|きえろ|きもい|きっしょ|うざい|うぜえ|がいじ|ごみくず|くずやろう|かすやろう|ばかやろう|のうなし|ちんこ|まんこ|せっくす|れいぷ/,
    // 空白を詰めると「わたし ねむい」「ところ すごい」も引っかかるので、ひらがなの語は前後の区切りを見る
    kana: /(^|[^ぁ-ゖ])(しね|ころす|しんで)(よ|や|ば|ほしい|くれ|[^ぁ-ゖ]|$)/,
  },
  {
    kind: "privacy",
    message: "電話番号・メールアドレス・住所などの個人情報は書き込めません（連絡先は依頼が成立してから LINE で）",
    raw: /0\d{1,4}[-ー−(（\s]?\d{1,4}[-ー−)）\s]?\d{3,4}|[\w.+-]+@[\w-]+\.[\w.]+|(都|道|府|県).{1,6}(市|区|町|村).{0,10}\d+[-−ー]\d+/,
  },
  {
    kind: "money",
    message: "現金や電子マネーでのやりとり・換金はできません（ぺいは学内のお礼用ポイントです）",
    folded: /\d+円(で|払|はら|渡|わた|あげ|くれ|ちょうだい|売|買)|現金|げんきん|換金|かんきん|ぺいぺい|paypay|振込|振り込|ふりこみ|あまぎふ|amazonぎふと|ぎふとけん|ぎふと券|りんくす|kyash|venmo|口座番号|楽天ぺい|merpay|めるぺい|ぺいを?(売|買|うる|かう)/,
  },
  {
    kind: "spam",
    message: "勧誘・宣伝にあたる内容は書き込めません",
    folded: /副業|ふくぎょう|稼げる|かせげる|不労所得|投資案件|情報商材|ねずみ講|まるち(商法|しょうほう|びじねす)|ねっとわくびじねす|せみな(に|へ)(来|き)|おいしいはなし|せどり|ばいなり|仮想通貨|fx(で|自動)|line(登録|追加)(で|して)(稼|もら)/,
  },
];

export type CheckResult = { ok: true } | { ok: false; reason: string };

export function checkText(...texts: string[]): CheckResult {
  for (const t of texts) {
    if (!t) continue;
    const raw = t.normalize("NFKC");
    const folded = fold(t);
    const kana = raw.toLowerCase().replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
    for (const r of RULES) {
      if ((r.folded && r.folded.test(folded)) || (r.raw && r.raw.test(raw)) || (r.kana && r.kana.test(kana))) {
        return { ok: false, reason: r.message };
      }
    }
  }
  return { ok: true };
}

/** 授業中の連絡専用：数字や英数字だけの短い連絡（出席コドに見えるもの）を弾く */
export function checkLiveText(text: string): CheckResult {
  const base = checkText(text);
  if (!base.ok) return base;
  const compact = text.normalize("NFKC").replace(/\s/g, "");
  if (/^[a-z0-9]{2,10}$/i.test(compact)) return { ok: false, reason: "数字や英字だけの連絡は投稿できません（出席コードの共有はできません）" };
  if (/(code|こど|ぱすわど|password|pass|番号)/.test(fold(text)) && /\d{3,}/.test(compact)) {
    return { ok: false, reason: "出席コードの共有はできません" };
  }
  return { ok: true };
}

export function checkUrl(url: string): CheckResult {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, reason: "http(s) の URL だけ登録できます" };
    if (/(bit\.ly|tinyurl|t\.co|is\.gd|cutt\.ly|ow\.ly)$/i.test(u.hostname)) return { ok: false, reason: "短縮 URL は登録できません" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "URL の形が正しくありません" };
  }
}

// ---- 回数の上限（連投・乱用対策） ----
export const LIMITS = {
  postsPerMinute: 3,
  postsPerDay: 40,
  livePerCourseDay: 2,
  assignmentsPerDay: 8,
  openRequests: 3,
  acceptedAtOnce: 3,
  sendsPerDay: 10,
  sendAmountPerDay: 3000,
  reportsPerDay: 15,
  postLength: 500,
};

// ---- 通報・信頼のしきい値 ----
export const MOD = {
  /** 何人から通報されたら非表示にするか */
  hideAfterReports: 3,
  /** 「違う」が何人以上で、確認より多ければ連絡を沈めるか */
  sinkLiveAfterDenies: 2,
  /** 連絡を全員に通知するのに必要な確認の人数（投稿者を含む） */
  notifyLiveAfterConfirms: 2,
  /** 非表示にされた投稿がこの数を超えると、投稿・依頼・送金を制限する */
  restrictAfterHidden: 3,
  /** アカウントそのものへの通報が何人から来たら制限するか */
  restrictUserAfterReports: 5,
  /** 依頼の完了報告から、依頼者が何も言わなければ自動で支払うまでの時間 */
  autoReleaseHours: 72,
  /** 名前を変えられる間隔（なりすまし対策） */
  nameChangeDays: 30,
};

export const REPORT_REASONS = {
  abuse: "悪口・嫌がらせ",
  false: "嘘の情報",
  cheat: "不正行為（代行・代返・答えの受け渡し）",
  spam: "宣伝・勧誘・荒らし",
  privacy: "個人情報の書き込み",
  other: "その他",
} as const;
