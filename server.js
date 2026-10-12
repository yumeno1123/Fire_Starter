// Standalone lightweight local HTTP server for Fire Starter
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES = {
  'html': 'text/html; charset=utf-8',
  'css': 'text/css; charset=utf-8',
  'js': 'text/javascript; charset=utf-8',
  'json': 'application/json; charset=utf-8',
  'png': 'image/png',
  'ico': 'image/x-icon',
  'webmanifest': 'application/manifest+json; charset=utf-8',
  'svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url === '/' ? '/index.html' : req.url;
  reqPath = decodeURIComponent(reqPath.split('?')[0]);
  const filePath = path.join(__dirname, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).slice(1);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` :
              process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function startListening(port) {
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`========================================================`);
    console.log(`  FLCL: FIRE STARTER`);
    console.log(`  Server running at: ${url}`);
    console.log(`  (Close this window when you want to stop the game)`);
    console.log(`========================================================`);
    openBrowser(url);
  });

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying port ${port + 1}...`);
      startListening(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startListening(8080);
