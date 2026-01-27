const fs = require('fs');
const path = require('path');

const thesisPath = path.join(process.cwd(), 'docs','thesis','build','BSC-Diplomawork-Final.md');
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

const thesis = fs.readFileSync(thesisPath, 'utf8');
const pathRegex = /\/[a-zA-Z0-9_\-\[\]\/]+/g; // naive path matcher
const matches = thesis.match(pathRegex) || [];
const uniquePaths = Array.from(new Set(matches))
  .filter(p => !p.startsWith('//'))
  .filter(p => !p.includes('http'));

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

const missing = uniquePaths.filter(p => !routeExists(p));

console.log(JSON.stringify({
  pathsInThesis: uniquePaths,
  missingRoutesFromThesis: missing
}, null, 2));
