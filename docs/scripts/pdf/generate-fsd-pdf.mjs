import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const docsDir = path.join(projectRoot, 'docs');

const sourceMdPath = path.join(docsDir, 'FSD-Conference-Master-style.md');
const targetPdfPath = path.join(docsDir, 'FSD - Conference Manager Web Application.pdf');
const backupPdfPath = path.join(docsDir, 'FSD - Conference Manager Web Application.backup-2026-01-11.pdf');

const run = async () => {
  await ensureFileExists(sourceMdPath);
  await ensureFileExists(targetPdfPath);

  await backupOriginalPdf();

  const markdown = await fs.readFile(sourceMdPath, 'utf8');
  const htmlBody = renderMarkdownToHtml(markdown);
  const mermaidJs = await loadMermaidScript();

  const html = buildHtmlDocument({ htmlBody, mermaidJs });

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });
    await page.setContent(html, { waitUntil: 'load' });

    // Ensure mermaid exists and render diagrams before printing
    await page.waitForFunction(() => typeof window !== 'undefined' && typeof window.mermaid !== 'undefined');
    await page.evaluate(async () => {
      await window.mermaid.run();
    });

    await page.pdf({
      path: targetPdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '24mm',
        right: '22mm',
        bottom: '24mm',
        left: '22mm'
      }
    });
  } finally {
    await browser.close();
  }

  console.log(`Generated: ${targetPdfPath}`);
  console.log(`Backup:    ${backupPdfPath}`);
};

const ensureFileExists = async (filePath) => {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error('Not a file');
  } catch {
    throw new Error(`Missing required file: ${filePath}`);
  }
};

const backupOriginalPdf = async () => {
  try {
    await fs.stat(backupPdfPath);
    // Backup already exists; keep it.
    return;
  } catch {
    // continue
  }

  await fs.copyFile(targetPdfPath, backupPdfPath);
};

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const renderMarkdownToHtml = (markdown) => {
  const renderer = new marked.Renderer();
  renderer.code = (code, infostring) => {
    const lang = (infostring ?? '').trim().toLowerCase();
    if (lang === 'mermaid') {
      return `<div class="mermaid">${escapeHtml(code)}</div>`;
    }
    const safeLang = lang ? `language-${lang}` : '';
    return `<pre><code class="${safeLang}">${escapeHtml(code)}</code></pre>`;
  };

  marked.setOptions({
    gfm: true,
    breaks: false,
    renderer
  });

  return marked.parse(markdown);
};

const loadMermaidScript = async () => {
  // Load mermaid from local node_modules so this works offline.
  const mermaidPath = path.join(__dirname, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
  return fs.readFile(mermaidPath, 'utf8');
};

const buildHtmlDocument = ({ htmlBody, mermaidJs }) => {
  const css = `
    @page { size: A4; margin: 24mm 22mm; }

    body {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      line-height: 1.35;
      font-size: 12pt;
    }

    h1 { font-size: 18pt; font-weight: 700; text-align: center; margin: 0 0 14pt; }
    h2 { font-size: 14pt; font-weight: 700; margin: 16pt 0 8pt; }
    h3 { font-size: 12pt; font-weight: 700; margin: 12pt 0 6pt; }

    p { margin: 0 0 8pt; }

    ul, ol { margin: 6pt 0 10pt 22pt; }
    li { margin: 2pt 0; }

    pre {
      background: #fafafa;
      border: 1px solid #e5e5e5;
      padding: 8pt;
      overflow: hidden;
      font-size: 10.5pt;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 10pt 0;
    }
    th, td {
      border: 1px solid #333;
      padding: 6pt;
      vertical-align: top;
      font-size: 11pt;
    }

    .page-break { page-break-after: always; }

    /* Mermaid diagrams */
    .mermaid { margin: 10pt 0 14pt; }
    .mermaid svg { max-width: 100% !important; height: auto !important; }
  `;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Functional Specification Document</title>
  <style>${css}</style>
</head>
<body>
  ${htmlBody}

  <script>${mermaidJs}</script>
  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
  </script>
</body>
</html>`;
};

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
