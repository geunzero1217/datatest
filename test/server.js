// 로컬 테스트용 정적 서버 (CORS 허용). GitHub Pages도 CORS 허용(Access-Control-Allow-Origin: *)이라 같은 조건
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.stat(p, (err, st) => {
    const file = !err && st.isDirectory() ? path.join(p, 'index.html') : p;
    fs.readFile(file, (e, buf) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (e) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
}).listen(8080, () => console.log('http://localhost:8080'));
