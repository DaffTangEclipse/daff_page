# daff_page

图书馆机器人 VLA 算法技术落地可行性报告的静态站点仓库。源文档为 Markdown，通过构建脚本生成自包含的 `index.html`，部署到 Cloudflare 静态托管。

## 目录结构

```
daff_page/
├── docs/
│   └── vla-tech.md        # 源文档（Markdown，唯一需要手工编辑的内容）
├── scripts/
│   ├── build.mjs          # 构建脚本：md → index.html + worker.js
│   └── server.mjs         # 本地开发服务器：模拟 Cloudflare Worker 返回页面
├── index.html             # 构建产物（本地预览 / 部署入口，勿手改）
├── worker.js              # 构建产物（Cloudflare Worker，内嵌 HTML，勿手改）
├── wrangler.jsonc         # Cloudflare Workers 配置（main: worker.js）
├── package.json           # npm 配置（build/dev 脚本 + marked 依赖）
├── package-lock.json      # 依赖锁文件
└── .gitignore             # 忽略 node_modules / .wrangler 等
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
# 方式一：本地模拟 Worker 服务器（推荐，与真实部署链路一致）
npm run dev          # 启动后访问 http://127.0.0.1:8787/
#   server.mjs 直接调用 worker.js 的 fetch 逻辑，返回内容和线上完全一致

# 方式二：直接用浏览器打开构建产物（file:// 协议，无需启动服务）
start index.html
```

### `npm run dev` 与 `npx wrangler dev` 的区别

| | `npm run dev`（本仓库提供） | `npx wrangler dev`（官方工具） |
| --- | --- | --- |
| 本质 | 极简 HTTP 服务器，直接调用 `worker.js` 的 `fetch` | wrangler 官方本地开发服务器，运行完整 Cloudflare Worker 运行时 |
| 模拟程度 | 仅 fetch 返回 HTML 的逻辑 | 完整运行时（KV / D1 / R2 绑定、定时任务等） |
| Node 版本要求 | ≥ 18（当前项目 v20 即可） | ≥ 22（wrangler 4.x 要求） |
| 是否需要登录 | 否 | 否（dev 模式） |
| 访问地址 | http://127.0.0.1:8787/ | http://localhost:8787/ |
| 适用场景 | 本项目（单页面，无绑定）够用 | 需要调试完整 Worker 环境时 |

本项目的 Worker 只有一个 `fetch` 返回内嵌 HTML，`npm run dev` 已足够且无 Node 版本门槛；`npx wrangler dev` 是官方全能方案，但需要 Node ≥ 22。

## 更新文档

1. 编辑 `docs/vla-tech.md`
2. 本地预览：`npm run dev` 后刷新浏览器（或先 `npm run build` 再直接打开 index.html）
3. 提交并推送：

```bash
git add docs/ index.html worker.js
git commit -m "docs: 更新报告内容"
git push
```

> 推送后 Cloudflare 的 Git 集成会自动重新构建部署（执行 `npx wrangler deploy`，读取 `wrangler.jsonc`）。

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
