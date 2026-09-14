/**
 * build.mjs — 将 docs/*.md 批量转换为 index.html + worker.js（多页路由）
 * 用法：npm run build
 * 依赖：marked（npm install marked）
 *
 * 约定：
 *  - docs/*.md 每个文件生成一个页面，路由为 /文件名（如 /beauty_vim）
 *  - vla-tech.md 作为默认首页（/），同时保留 /vla-tech 与 /vla-tech.html 路由
 *  - md 内站内链接写相对路径 xxx.md，构建时自动重写为 xxx.html
 *  - 所有页面共享一个顶部站点导航条，可互相跳转
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { marked } from 'marked';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = join(ROOT, 'docs');
const OUT_PATH = join(ROOT, 'index.html');
const WORKER_PATH = join(ROOT, 'worker.js');
const HOME_ROUTE = 'vla-tech'; // 默认首页

// ---- marked 全局配置（toc / extraHeadingSeq 为模块级，渲染前重置）----
let toc = [];
let extraHeadingSeq = 0;

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

// ---- 渲染单个 Markdown 页面 ----
function renderPage(md) {
  // 生成 TOC（h2/h3；h1 作为页面主标题）
  const lines = md.split('\n');
  toc = [];
  let tocSeq = 0;
  for (const line of lines) {
    const m = line.match(/^(#{2,3})\s+(.+)/);
    if (m) {
      const level = m[1].length;
      const text = m[2].replace(/\*\*|`/g, '').trim();
      toc.push({ level, text, id: `toc-${++tocSeq}` });
    }
  }

  extraHeadingSeq = 0;
  let bodyHtml = marked.parse(md);

  // 站内链接重写：href="xxx.md" → href="xxx.html"（不影响外链 http(s)）
  bodyHtml = bodyHtml.replace(/href="([^"]+)\.md"/g, 'href="$1.html"');

  // 组装 TOC HTML
  let tocHtml = '';
  for (const item of toc) {
    const pad = item.level === 3 ? ' style="padding-left:18px;font-size:12.5px;"' : '';
    tocHtml += `<a href="#${item.id}"${pad}>${item.text}</a>`;
  }

  return { bodyHtml, tocHtml, toc };
}

// ---- 页面模板 ----
function buildHtml({ title, navHtml, tocHtml, bodyHtml }) {
  return `<!DOCTYPE html>
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
  /* 顶部站点导航 */
  .sitenav { display: flex; flex-wrap: wrap; gap: 4px 20px; align-items: center;
             padding: 10px 24px; background: #f6f8fa; border-bottom: 1px solid var(--border); }
  .sitenav .label { font-size: 12px; color: #57606a; margin-right: 4px; }
  .sitenav a { color: #0969da; text-decoration: none; font-size: 14px; }
  .sitenav a:hover { text-decoration: underline; }
  .layout { display: flex; min-height: 100vh; }
  /* 左侧目录 */
  .toc {
    width: var(--toc-w); flex: 0 0 var(--toc-w);
    border-right: 1px solid var(--border);
    padding: 28px 18px; position: sticky; top: 0; height: 100vh; overflow-y: auto;
    background: #fff; font-size: 14px;
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
<nav class="sitenav" aria-label="站点导航"><span class="label">📄 页面：</span>${navHtml}</nav>
<div class="layout">
  <nav class="toc" aria-label="目录">
    <div class="brand">📚 本页目录</div>
    <div class="brand-sub">${title}</div>
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
}

// ---- 主流程：扫描并构建所有页面 ----
const mdFiles = readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md')).sort();
if (mdFiles.length === 0) {
  console.error('✘ docs/ 下没有 Markdown 文件');
  process.exit(1);
}

const pages = [];
for (const file of mdFiles) {
  const route = basename(file, '.md');
  const md = readFileSync(join(DOCS_DIR, file), 'utf8');
  const firstH1 = md.match(/^#\s+(.+)/m);
  const title = firstH1 ? firstH1[1].trim() : route;
  pages.push({ route, title, md });
}

// 首页 = HOME_ROUTE 对应页（不存在则取第一个）
const homeIndex = pages.findIndex((p) => p.route === HOME_ROUTE);
const homeIdx = homeIndex >= 0 ? homeIndex : 0;

// 站点导航条（首页为 /，其余为 /route）
const navHtml = pages
  .map((p) => {
    const href = p.route === pages[homeIdx].route ? '/' : `/${p.route}`;
    return `<a href="${href}">${p.route}</a>`;
  })
  .join('');

// 逐页生成 HTML
for (const p of pages) {
  const { bodyHtml, tocHtml } = renderPage(p.md);
  p.html = buildHtml({ title: p.title, navHtml, tocHtml, bodyHtml });
  p.tocCount = toc.length;
}

// index.html 输出首页
const homePage = pages[homeIdx];
writeFileSync(OUT_PATH, homePage.html, 'utf8');
console.log(`✔ ${OUT_PATH} 已生成（${(homePage.html.length / 1024).toFixed(1)} KB，首页 ${homePage.route}）`);

// ---- 生成 Cloudflare Worker（多页路由，内嵌全部 HTML）----
// JSON.stringify 生成合法 JS 字符串字面量，引号/反引号/${} 均安全转义
const routeEntries = new Map();
for (const p of pages) {
  const key = p.route === pages[homeIdx].route ? '/' : `/${p.route}`;
  routeEntries.set(key, p.html);
  routeEntries.set(key + '.html', p.html);
}
// 首页额外别名：/vla-tech、/vla-tech.html
if (homePage.route !== '/') {
  routeEntries.set(`/${homePage.route}`, homePage.html);
  routeEntries.set(`/${homePage.route}.html`, homePage.html);
}

const pagesObject = [...routeEntries.entries()]
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
  .join(',\n');

const worker = `/**
 * Cloudflare Worker — daff_page 静态页面服务（多页路由）
 * 本文件由 scripts/build.mjs 自动生成，请勿手改。
 * 更新页面：编辑 docs/*.md 后运行 npm run build。
 * 部署：将本文件内容粘贴到 Cloudflare Dashboard → Workers → 代码编辑器。
 */
const PAGES = {
${pagesObject},
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\\/+$/, '') || '/';
    const page = PAGES[path] ?? PAGES['/'];
    return new Response(page, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  },
};
`;

writeFileSync(WORKER_PATH, worker, 'utf8');
console.log(`✔ ${WORKER_PATH} 已生成（${(worker.length / 1024).toFixed(1)} KB，${routeEntries.size} 条路由）`);
console.log('  路由：', [...routeEntries.keys()].join('  '));
