# daff_page

图书馆机器人 VLA 算法技术落地可行性报告的静态站点仓库。源文档为 Markdown，通过构建脚本生成自包含的 `index.html`，部署到 Cloudflare 静态托管。

## 目录结构

```
daff_page/
├── docs/
│   └── vla-tech.md        # 源文档（Markdown，唯一需要手工编辑的内容）
├── scripts/
│   └── build.mjs          # 构建脚本：md → index.html + worker.js
├── index.html             # 构建产物（本地预览 / 部署入口，勿手改）
├── worker.js              # 构建产物（Cloudflare Worker，内嵌 HTML，勿手改）
├── package.json           # npm 配置（build 脚本 + marked 依赖）
├── package-lock.json      # 依赖锁文件
└── .gitignore             # 忽略 node_modules 等
```

> `index.html` 与 `worker.js` 均由构建脚本自动生成，修改源文档后需重新构建；不要直接编辑它们。

## 前置要求

- Node.js ≥ 18（构建脚本使用 ESM + `import.meta.url`）
- npm（随 Node.js 安装）

## 构建步骤

```bash
# 1. 安装依赖（首次或依赖变更后执行）
npm install

# 2. 构建页面
npm run build
```

构建产物输出到根目录 `index.html`。

## 本地预览

```bash
# 方式一：直接用浏览器打开
#   双击 index.html，或
start index.html

# 方式二：本地 HTTP 服务（推荐，可验证相对路径资源）
npx serve .
```

## 更新文档

1. 编辑 `docs/vla-tech.md`
2. 本地预览：`npm run build` 后刷新浏览器
3. 提交并推送：

```bash
git add docs/ index.html
git commit -m "docs: 更新报告内容"
git push
```

## 部署到 Cloudflare

### Cloudflare Workers（推荐，与当前 worker.js 部署方式一致）

构建时已自动生成 `worker.js`（内嵌完整页面 HTML），无需额外配置：

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → 你的 Worker
2. 进入「编辑代码」，把仓库根目录 `worker.js` 的**全部内容**粘贴替换
3. 点击「部署」（Deploy）
4. 访问你的 Worker 域名即可看到页面

以后更新内容：编辑 `docs/vla-tech.md` → `npm run build` → 重新粘贴 `worker.js` 内容 → 部署。

> 若用 `wrangler deploy` 命令行部署，需登录 Cloudflare 账号（`npx wrangler login`）后执行 `npx wrangler deploy`。

### Cloudflare Pages（Git 集成）

| 配置项 | 值 |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `/`（根目录） |

## 技术说明

- Markdown 渲染：`marked`（GFM 表格）
- Mermaid 架构图：浏览器端由 mermaid.js 渲染
- 代码高亮：highlight.js
- 样式：github-markdown-css + 自定义左侧目录布局
- CDN：cdnjs（github-markdown-css / highlight.js / mermaid）
