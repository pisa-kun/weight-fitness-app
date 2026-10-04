import { createServer } from "node:http";
import { createServices } from "../application/services";
import { MemoryObjectStore } from "../infrastructure/memory-object-store";
import { createRouter } from "./router";

// ローカル開発用API。S3の代わりにインメモリストアを使う（再起動でデータは消える）

const port = Number(process.env.DEV_API_PORT ?? 8787);
const router = createRouter(createServices(new MemoryObjectStore()));

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const headers: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v.join(",") : v;
  const url = new URL(req.url ?? "/", "http://localhost");
  const result = await router({
    method: req.method ?? "GET",
    path: url.pathname,
    headers,
    body: chunks.length > 0 ? new Uint8Array(Buffer.concat(chunks)) : null,
  });
  res.writeHead(result.status, result.headers);
  res.end(typeof result.body === "string" ? result.body : Buffer.from(result.body));
}).listen(port, "127.0.0.1", () => {
  console.info(`dev API listening on http://127.0.0.1:${port} (in-memory storage)`);
});
