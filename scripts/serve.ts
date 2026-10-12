/** Serves dist/ locally under the same base path as production, e.g. http://localhost:4321/reclo/ */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { SITE } from '../src/site/config.ts';

const dist = join(import.meta.dirname, '..', 'dist');
const port = Number(process.env.PORT ?? 4321);
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain',
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (!url.pathname.startsWith(SITE.base)) {
    res.writeHead(302, { location: SITE.base });
    return res.end();
  }
  let file = normalize(join(dist, decodeURIComponent(url.pathname.slice(SITE.base.length))));
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404, { 'content-type': types['.html']! });
    return createReadStream(join(dist, '404.html')).pipe(res);
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Reclo preview: http://localhost:${port}${SITE.base}`));
