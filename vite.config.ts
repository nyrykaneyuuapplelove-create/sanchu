import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { parseTimetable, TimetableError } from "./api/parse-timetable";

// 開発サーバーでも /api/parse-timetable を使えるようにする（本番は Vercel の api/ 関数）
function devApi(): Plugin {
  return {
    name: "santyu-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/parse-timetable", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        res.setHeader("Content-Type", "application/json");
        try {
          let body;
          try {
            body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {
            throw new TimetableError("リクエストの形式が正しくありません", 400);
          }
          const courses = await parseTimetable(body.image, body.mediaType);
          res.end(JSON.stringify({ courses }));
        } catch (e) {
          res.statusCode = e instanceof TimetableError ? e.status : 500;
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
});
