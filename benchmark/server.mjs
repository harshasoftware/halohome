/**
 * Simple dev server with COOP/COEP headers for SharedArrayBuffer support
 *
 * Usage: node benchmark/server.mjs
 * Then open: http://localhost:3333/benchmark/
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.ts': 'text/javascript', // Will be served as JS for testing
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const PORT = 3333;

const server = http.createServer((req, res) => {
  // Parse URL
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/benchmark/index.html';
  if (urlPath === '/benchmark/' || urlPath === '/benchmark') urlPath = '/benchmark/index.html';

  const filePath = path.join(ROOT, urlPath);
  const ext = path.extname(filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Set COOP/COEP headers for SharedArrayBuffer support
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try with .html extension
      const htmlPath = filePath + '.html';
      fs.stat(htmlPath, (err2, stats2) => {
        if (err2 || !stats2.isFile()) {
          console.log(`404: ${urlPath}`);
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        serveFile(htmlPath, '.html', res);
      });
      return;
    }

    serveFile(filePath, ext, res);
  });
});

function serveFile(filePath, ext, res) {
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(`Error reading ${filePath}:`, err);
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Scout Algorithm Benchmark Server                 ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Server running at: http://localhost:${PORT}/benchmark/      ║
║                                                            ║
║  COOP/COEP headers enabled for SharedArrayBuffer support   ║
║                                                            ║
║  Press Ctrl+C to stop                                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
});
