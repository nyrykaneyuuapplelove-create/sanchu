// 時間割スクショの読み取り（Vercel Functions・Node.js ランタイム）。
// 環境変数 ANTHROPIC_API_KEY を使う。開発中は vite.config.ts からも同じ関数を呼ぶ。
// Vercel では api/ の中のファイル同士の import が解決できないことがあるので、1 ファイルにまとめている。
import Anthropic from "@anthropic-ai/sdk";

export class TimetableError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface ParsedCourse {
  name: string;
  teacher: string;
  day: number; // 0=月 … 5=土
  period: number; // 1〜7
  room: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    courses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "授業名" },
          teacher: { type: "string", description: "担当教員。読めなければ空文字" },
          day: { type: "integer", description: "曜日。0=月,1=火,2=水,3=木,4=金,5=土" },
          period: { type: "integer", description: "時限（1〜7）" },
          room: { type: "string", description: "教室。読めなければ空文字" },
        },
        required: ["name", "teacher", "day", "period", "room"],
        additionalProperties: false,
      },
    },
  },
  required: ["courses"],
  additionalProperties: false,
} as const;

const PROMPT = `これは大学の時間割管理アプリ「UNIPA」の時間割一覧画面のスクリーンショットです。
画像に写っている授業をすべて抜き出してください。
- 1つのコマに1授業として、曜日と時限を表の位置から判断してください。
- 2コマ連続の授業は、コマごとに別の要素として出力してください。
- 授業名・教員名・教室は画像の表記のまま書き写してください（略さない、推測で補わない）。
- 時間割の画面でない場合や、授業が1つも読み取れない場合は courses を空配列にしてください。`;

// Vercel の関数が受け取れる本文は 4.5MB まで。base64 で 4MB を超える画像は先に断る
const MAX_IMAGE_BASE64 = 4_000_000;

export async function parseTimetable(image: unknown, mediaType: unknown): Promise<ParsedCourse[]> {
  if (typeof image !== "string" || image.length === 0) throw new TimetableError("画像がありません", 400);
  if (image.length > MAX_IMAGE_BASE64) throw new TimetableError("画像が大きすぎます", 413);
  if (mediaType !== "image/jpeg" && mediaType !== "image/png" && mediaType !== "image/webp") {
    throw new TimetableError("対応していない画像形式です", 400);
  }

  let response;
  try {
    const client = new Anthropic();
    response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      throw new TimetableError("サーバーに ANTHROPIC_API_KEY が設定されていません", 500);
    } else if (e instanceof Anthropic.RateLimitError) {
      throw new TimetableError("混み合っています。少し待ってからもう一度お試しください", 429);
    } else if (e instanceof Anthropic.APIError) {
      throw new TimetableError(`読み取りに失敗しました（${e.status}）`, 502);
    }
    // API キーが見つからないときは、SDK がクライアント作成時にエラーを出す
    throw new TimetableError("サーバーに ANTHROPIC_API_KEY が設定されていません", 500);
  }

  if (response.stop_reason === "refusal") throw new TimetableError("この画像は読み取れませんでした", 422);
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let parsed: { courses: ParsedCourse[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TimetableError("読み取り結果を解釈できませんでした", 502);
  }
  return parsed.courses.filter(
    (c) => c.name.trim() && c.day >= 0 && c.day <= 5 && c.period >= 1 && c.period <= 7,
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => {
      throw new TimetableError("リクエストの形式が正しくありません", 400);
    });
    const courses = await parseTimetable(body.image, body.mediaType);
    return Response.json({ courses });
  } catch (e) {
    const status = e instanceof TimetableError ? e.status : 500;
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status });
  }
}
