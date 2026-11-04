# 推演 · 个人理论推导笔记库

一个用于分享 LaTeX 编译 PDF 的中文个人网站。采用原生 HTML、CSS 和 JavaScript，自带 PDF.js 阅读器，无需安装 npm 依赖。GitHub 保存源码与 PDF，GitHub Pages 提供网站托管，无需租服务器。

- 仓库：https://github.com/Disoyu/website
- 启用 Pages 并成功部署后的地址：https://disoyu.github.io/website/
- 支持标题/摘要/关键词搜索、专题和标签筛选、日期/标题排序。
- 支持 PDF.js 在线阅读、翻页、页码跳转、缩放、选择文字、新窗口阅读，以及 PDF 与可选 TeX 下载。
- 阅读地址采用 `#note/笔记id`，可直接分享，刷新不产生 GitHub Pages 路由 404。
- 提供三篇明确标注的示例笔记，发布自己的笔记时可以删除示例条目。

## 本地运行

安装 Node.js 22 或以上版本。不需要运行 npm install，也不需要 LaTeX 环境来运行网站。

```powershell
cd D:\gitspace\website
node scripts/serve.mjs
```

打开 http://127.0.0.1:4173/ 。编辑文件后会自动重新构建，手动刷新浏览器即可查看。按 Ctrl+C 停止。

模拟 GitHub 项目子路径：

```powershell
node scripts/serve.mjs --base=/website/
```

对应地址为 http://127.0.0.1:4173/website/ 。不要直接双击 index.html；浏览器不允许 file:// 页面通过 fetch 读取 JSON。

## 首次发布到 GitHub Pages

1. 确认仓库为公开仓库（GitHub Free 使用公开仓库提供 Pages）。如使用支持私有仓库 Pages 的付费计划，按该计划的规则设置。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
3. 推送 main 分支。首次使用 HTTPS 推送时，按 Git Credential Manager 的提示登录 GitHub；不要把密码或 token 写进项目。

```powershell
git push -u origin main
```

4. 打开仓库 **Actions**，等待 `Deploy notes to GitHub Pages` 成功。如果是在首次推送后才启用 Pages，可在此工作流页面使用 **Run workflow** 重新部署。
5. 访问 https://disoyu.github.io/website/ 。之后每次推送 main 分支都会自动校验、构建并更新网站。

已包含 `.github/workflows/deploy.yml`，使用 GitHub 自动提供的 GITHUB_TOKEN，无需另建部署密钥或服务器。只有 `dist/` 中的网站资源会成为 Pages 发布内容；README、构建脚本和临时文件不会发布为网页资源。

官方说明：[创建 Pages 网站](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)、[自定义 Actions 部署](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 添加一篇 PDF

1. 将本地编译好的 PDF 放到 `public/pdfs/`，建议使用简短英文文件名，例如 `quantum-control.pdf`。中文和空格文件名也支持。
2. 在 `data/notes.json` 的数组中添加一条记录，条目之间用英文逗号分隔：

```json
{
  "id": "quantum-control",
  "title": "量子控制中的梯度推导",
  "description": "从演化算符的变分出发，整理目标函数梯度的计算过程。",
  "category": "量子力学",
  "tags": ["量子控制", "梯度", "变分"],
  "date": "2026-11-05",
  "file": "pdfs/quantum-control.pdf",
  "formula": "δU / δu",
  "featured": false,
  "demo": false
}
```

3. 可选：把独立可编译的 `.tex` 文件放到 `public/tex/`，在记录中增加 `"source": "tex/quantum-control.tex"`。如果源文件依赖其他文件且不打算提供完整源码，省略 source 即可。
4. 执行校验、提交并推送：

```powershell
node scripts/check.mjs
git add data/notes.json public/pdfs/ public/tex/
git commit -m "Add quantum control notes"
git push
```

字段说明：`id` 必须唯一，使用小写英文字母、数字及连字符；`date` 使用 YYYY-MM-DD；`formula` 是卡片装饰的纯文本公式，支持 Unicode，不解析 LaTeX；`source`、`formula`、`featured`、`demo` 可省略。文件大小由构建时自动读取，不需要填写。搜索覆盖记录中的标题、摘要、专题和关键词，不搜索 PDF 正文。

更新已有 PDF 时直接替换同名文件，并修改记录的 date。id 保持不变，已有分享链接仍然有效。

删除笔记时从 JSON 中移除条目即可；构建只复制条目引用的 PDF 和 TeX 文件。文件仍在 Git 仓库历史中；不要把私密笔记加入公开仓库。

网站是静态分享站，没有在线管理后台；新 PDF 通过 Git 上传。内嵌阅读器使用随站点托管的 PDF.js，支持现代浏览器；老旧浏览器或需要密码的 PDF 可使用“新窗口打开”或下载。网页资源全部从本站加载，不依赖外部 CDN。

## 更改站点信息

编辑 `data/site.json` 中的站名、作者、简介、关于和 GitHub 仓库地址。页面内容会读取配置，构建时还会同步页面标题与描述。更换名称时如需完全自定义首屏标语、Logo、页脚或无 JavaScript 提示，可进一步编辑 `index.html`。外观在 `src/styles.css`，交互在 `src/app.js`。

## 构建与检查

```powershell
node scripts/check.mjs
node scripts/build.mjs
node scripts/serve.mjs --dist
```

构建会检查必填字段、唯一 id、合法日期、PDF 文件头、实际文件存在性和路径。错误会阻止部署，避免发布失效链接。`dist/` 是生成目录，请勿直接编辑，不需要提交到 Git。

```text
website/
├── index.html                页面结构
├── src/                      样式和浏览器交互
├── data/
│   ├── site.json              个人资料与站点信息
│   └── notes.json             笔记目录（主要维护这里）
├── public/
│   ├── pdfs/                 已编译的 PDF
│   ├── tex/                  可选的 TeX 源文件
│   ├── vendor/pdfjs/         自托管阅读器及其许可证
│   └── favicon.svg           站点图标
├── scripts/                  校验、构建、本地预览
└── .github/workflows/        GitHub Pages 自动部署
```

示例 PDF 已编译并随仓库提供。仅重新生成这些示例时，需要 TeX Live/XeLaTeX：

```powershell
.\scripts\compile-samples.ps1
```

## 容量

GitHub Pages 的站点大小上限为 1 GB，月带宽软限制为 100 GB。适合个人推导笔记；图片很多的 PDF 建议压缩。项目校验会拒绝达到 100 MiB 的单个文件。大量或大型文档可再迁移到 Releases 或独立文件存储。

参考：[GitHub Pages 限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)。

## 第三方组件

阅读器使用 [Mozilla PDF.js](https://mozilla.github.io/pdf.js/) 6.5.438，按 Apache-2.0 授权。许可证和字体、字符映射、WebAssembly 组件的许可文件均保留在 `public/vendor/pdfjs/`。JavaScript 与字体资源从本站加载，只有打开阅读窗口时才加载阅读器。

如需重新获取固定版本，运行 `python scripts/vendor-pdfjs.py`。脚本从 npm 官方 registry 获取发行包并校验 SHA-512 完整性；升级时应更改 VERSION 后重新进行阅读测试。
