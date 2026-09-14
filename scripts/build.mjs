/**
 * build.mjs — 将 docs/vla-tech.md 转换为自包含的 index.html
 * 用法：node scripts/build.mjs（或 npm run build）
 * 依赖：marked（npm install marked）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { marked } from 'marked';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MD_PATH = join(ROOT, 'docs', 'vla-tech.md');
const OUT_PATH = join(ROOT, 'index.html');
const md = readFileSync(MD_PATH, 'utf8');

// ---- 生成标题目录（TOC）----
const lines = md.split('\n');
const toc = [];
let tocSeq = 0;
for (const line of lines) {
  const m = line.match(/^(#{2,3})\s+(.+)/); // 只收 h2/h3，h1 作为页面主标题
  if (m) {
    const level = m[1].length;
    const text = m[2].replace(/\*\*|`/g, '').trim();
    toc.push({ level, text, id: `toc-${++tocSeq}` });
  }
}

// ---- 配置 marked ----
let extraHeadingSeq = 0; // 不在 TOC 中的标题（h1）用确定性序号 id，避免每次构建产生 diff
marked.use({
  gfm: true,
  renderer: {
    // mermaid 代码块 → mermaid 可识别的元素
    code({ text, lang }) {
      if (lang === 'mermaid') {
        return `<pre class="mermaid">${text.trim()}</pre>`;
      }
      const cls = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${cls}>${text}</code></pre>`;
    },
    // 标题注入锚点 id，供 TOC 跳转
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const idx = toc.findIndex((t) => t.text === text.replace(/<[^>]+>/g, '').trim());
      const id = idx >= 0 ? toc[idx].id : `h-${++extraHeadingSeq}`;
      return `<h${depth} id="${id}">${text}</h${depth}>`;
    },
  },
});

// ---- 渲染正文 ----
const bodyHtml = marked.parse(md);

// ---- 组装 TOC HTML ----
let tocHtml = '';
for (const item of toc) {
  const pad = item.level === 3 ? ' style="padding-left:18px;font-size:12.5px;"' : '';
  tocHtml += `<a href="#${item.id}"${pad}>${item.text}</a>`;
}

// ---- 页面模板 ----
const title = '图书馆机器人 VLA 算法技术落地可行性报告';
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-light.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<style>
  :root { --toc-w: 280px; --border: #d8dee4; }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: #fff; color: #1f2328;
         font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
  .layout { display: flex; min-height: 100vh; }
  /* 左侧目录 */
  .toc {
    width: var(--toc-w); flex: 0 0 var(--toc-w);
    border-right: 1px solid var(--border);
    padding: 28px 18px; position: sticky; top: 0; height: 100vh; overflow-y: auto;
    background: #f6f8fa; font-size: 14px;
  }
  .toc .brand { font-weight: 700; font-size: 15px; margin-bottom: 6px; color: #0969da; }
  .toc .brand-sub { font-size: 12px; color: #57606a; margin-bottom: 18px; }
  .toc a { display: block; padding: 5px 10px; margin: 1px 0; border-radius: 6px;
           color: #24292f; text-decoration: none; line-height: 1.45; }
  .toc a:hover { background: #eaeef2; color: #0969da; }
  /* 右侧正文 */
  .content { flex: 1; min-width: 0; padding: 40px 48px 80px; }
  .markdown-body { max-width: 960px; margin: 0 auto; }
  .markdown-body h1 { padding-bottom: .3em; border-bottom: 1px solid var(--border); }
  .markdown-body pre { border-radius: 8px; }
  .markdown-body pre.mermaid { background: #fff; text-align: center; border: 1px dashed var(--border); }
  .markdown-body table { display: table; width: 100%; }
  .markdown-body img { max-width: 100%; }
  /* 移动端 */
  @media (max-width: 860px) {
    .layout { flex-direction: column; }
    .toc { width: 100%; flex: none; height: auto; position: static; max-height: 40vh; }
    .content { padding: 24px 16px 60px; }
  }
</style>
</head>
<body>
<div class="layout">
  <nav class="toc" aria-label="目录">
    <div class="brand">📚 报告导航</div>
    <div class="brand-sub">图书馆机器人 VLA 算法技术落地可行性报告</div>
    ${tocHtml}
  </nav>
  <main class="content">
    <article class="markdown-body">
${bodyHtml}
    </article>
  </main>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js"></script>
<script>
  hljs.highlightAll();
  mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' });
</script>
</body>
</html>
`;

writeFileSync(OUT_PATH, html, 'utf8');
console.log(`✔ ${OUT_PATH} 已生成（${(html.length / 1024).toFixed(1)} KB，TOC ${toc.length} 项）`);
