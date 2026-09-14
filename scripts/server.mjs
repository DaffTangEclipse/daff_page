/**
 * server.mjs — 本地模拟 Cloudflare Worker 的 HTTP 服务器
 * 用法：npm run dev（或 node scripts/server.mjs）
 * 启动后访问 http://127.0.0.1:8787
 * 原理：直接复用 worker.js 的 fetch 逻辑，与真实部署链路一致
 */
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import worker from '../worker.js';

const PORT = 8787;
const HOST = '127.0.0.1';

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
  });
  const response = await worker.fetch(request);
  res.writeHead(response.status, {
    'Content-Type': response.headers.get('Content-Type') || 'text/plain',
    'Cache-Control': response.headers.get('Cache-Control') || 'no-cache',
  });
  res.end(await response.text());
});

server.listen(PORT, HOST, () => {
  console.log(`✔ 本地模拟 Worker 已启动：http://${HOST}:${PORT}`);
  console.log('  按 Ctrl+C 停止');
});
