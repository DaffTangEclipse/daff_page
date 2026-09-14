# daff_page

图书馆机器人 VLA 算法技术落地可行性报告的静态站点仓库。源文档为 Markdown，通过构建脚本生成自包含的 `index.html`，部署到 Cloudflare 静态托管。

## 目录结构

```
daff_page/
├── docs/
│   └── vla-tech.md        # 源文档（Markdown，唯一需要手工编辑的内容）
├── scripts/
│   └── build.mjs          # 构建脚本：md → HTML
├── index.html             # 构建产物（部署入口，勿手改）
├── package.json           # npm 配置（build 脚本 + marked 依赖）
├── package-lock.json      # 依赖锁文件
└── .gitignore             # 忽略 node_modules 等
```

> `index.html` 由构建脚本生成，修改源文档后需重新构建；不要直接编辑它。

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

仓库已连接 Cloudflare，推送 `main` 分支即触发自动部署。

### Cloudflare Pages（Git 集成）

| 配置项 | 值 |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `/`（根目录） |

### Cloudflare Workers（wrangler）

如使用 `wrangler deploy`，需在仓库根目录添加 `wrangler.toml` 并配置静态资产目录（指向根目录或构建产物目录），示例：

```toml
name = "daff_page"
compatibility_date = "2025-01-01"
assets = { directory = "./" }
```

## 技术说明

- Markdown 渲染：`marked`（GFM 表格）
- Mermaid 架构图：浏览器端由 mermaid.js 渲染
- 代码高亮：highlight.js
- 样式：github-markdown-css + 自定义左侧目录布局
- CDN：cdnjs（github-markdown-css / highlight.js / mermaid）
