import http from 'node:http';
import path from 'node:path';
import { createReadStream, watch } from 'node:fs';
import { stat } from 'node:fs/promises';
import { root } from './content.mjs';
import { build } from './build.mjs';

const output = path.resolve(root, 'dist');
const builtOnly = process.argv.includes('--dist');
const port = Number(process.env.PORT || 4173);
const baseArg = process.argv.find(arg => arg.startsWith('--base='));
const base = baseArg ? `/${baseArg.slice(7).split('/').filter(Boolean).join('/')}/` : '/';
if (!builtOnly) await build();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.tex': 'text/plain; charset=utf-8' };
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === base.slice(0, -1) && base !== '/') { response.writeHead(302, { Location: base }); response.end(); return; }
    if (!pathname.startsWith(base)) throw new Error('Not found');
    const relative = pathname.slice(base.length) || 'index.html';
    const file = path.resolve(output, relative);
    if (!file.startsWith(output + path.sep) || relative.split(/[\\/]/).some(part => part.startsWith('.'))) throw new Error('Not found');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not found');
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
    let start = 0, end = info.size - 1, code = 200;
    if (request.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!match || (!match[1] && !match[2])) { response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); response.end(); return; }
      start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
      if (start > end || start >= info.size) { response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); response.end(); return; }
      code = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    response.writeHead(code, { ...headers, 'Content-Length': end - start + 1 });
    if (request.method === 'HEAD') { response.end(); return; }
    createReadStream(file, { start, end }).on('error', () => response.destroy()).pipe(response);
  } catch { if (!response.headersSent) response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('404 · 文件不存在'); }
});
server.on('error', error => { console.error(`预览启动失败：${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}${base}\n${builtOnly ? '正在预览构建结果。' : '修改文件后自动重新构建；刷新浏览器查看。'} 按 Ctrl+C 停止。`));
if (!builtOnly) {
  let timer, running = false, pending = false;
  const rebuild = async () => {
    if (running) { pending = true; return; }
    running = true;
    try { await build(); } catch (error) { console.error(`构建失败：${error.message}`); }
    finally { running = false; if (pending) { pending = false; void rebuild(); } }
  };
  for (const entry of ['index.html', 'reader.html', 'src', 'data', 'public']) watch(path.join(root, entry), { recursive: !entry.endsWith('.html') }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 200); });
}
