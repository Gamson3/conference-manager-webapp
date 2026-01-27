const fs = require('fs');
const path = require('path');

const appDir = path.join(process.cwd(), 'client','src','app');

function listPageFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...listPageFiles(p));
    else if (e.isFile() && e.name === 'page.tsx') files.push(p);
  }
  return files;
}

function routeFromFile(filePath) {
  const rel = path.relative(appDir, path.dirname(filePath));
  const parts = rel.split(path.sep).filter(Boolean);
  const routeParts = parts.filter(p => !/^\(.*\)$/.test(p));
  const route = '/' + routeParts.join('/');
  return route === '/' ? '/' : route;
}

const pageFiles = listPageFiles(appDir);
const routeSet = new Set(pageFiles.map(routeFromFile));

const linkRegexes = [
  /<Link[^>]*?href=\{?"([^"]+)"\}?/g,
  /<Link[^>]*?href=\{?\'([^\']+)\'?/g,
  /router\.push\(\s*"([^"]+)"\s*\)/g,
  /router\.push\(\s*\'([^\']+)\'\s*\)/g,
  /href:\s*"([^"]+)"/g,
  /href:\s*\'([^\']+)\'/g,
];

const ignorePrefixes = ['http://','https://','mailto:','tel:'];

function normalize(pathStr) {
  if (!pathStr.startsWith('/')) return null;
  return pathStr.split(/[?#]/)[0];
}

const linksByFile = new Map();
for (const file of pageFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const links = new Set();
  for (const rx of linkRegexes) {
    let m;
    while ((m = rx.exec(content)) !== null) {
      const raw = m[1];
      if (ignorePrefixes.some(p => raw.startsWith(p))) continue;
      const n = normalize(raw);
      if (n) links.add(n);
    }
  }
  if (links.size > 0) linksByFile.set(file, Array.from(links));
}

function routeExists(pathStr) {
  if (routeSet.has(pathStr)) return true;
  for (const route of routeSet) {
    const routeParts = route.split('/').filter(Boolean);
    const pathParts = pathStr.split('/').filter(Boolean);
    if (routeParts.length !== pathParts.length) continue;
    let ok = true;
    for (let i=0;i<routeParts.length;i++) {
      const rp = routeParts[i];
      if (/^\[.+\]$/.test(rp)) continue;
      if (rp !== pathParts[i]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

const missing = [];
for (const [file, links] of linksByFile.entries()) {
  for (const link of links) {
    if (!routeExists(link)) missing.push({ file, link });
  }
}

const result = {
  totalPages: pageFiles.length,
  totalRoutes: routeSet.size,
  filesWithLinks: linksByFile.size,
  missingCount: missing.length,
  missing
};

console.log(JSON.stringify(result, null, 2));
