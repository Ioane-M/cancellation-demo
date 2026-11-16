// Tiny local dev server with the same URL rules as vercel.json. Run: node server.mjs  (default port 8765)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const port = process.env.PORT || 8765;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.sql': 'text/plain', '.md': 'text/plain; charset=utf-8' };
const send = (res, file) => { res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(file).pipe(res); };
http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(root, url === '/' ? 'index.html' : url);
  if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) return send(res, file);
  const seg = url.split('/').filter(Boolean);
  if (seg.length && seg[1] === 'patient') return send(res, path.join(root, 'patient.html'));
  if (seg.length) return send(res, path.join(root, 'index.html'));
  res.writeHead(404); res.end('Not found');
}).listen(port, () => console.log('Openslot dev server on http://localhost:' + port));
