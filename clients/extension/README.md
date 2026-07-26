# StarNav Browser Extension

浏览器扩展客户端，用于快速添加、搜索和跳转 StarNav 书签。

<!-- version-sync:start -->

## 当前版本

- 插件版本：`v1`
- Manifest 包版本：`1.0.0`
<!-- version-sync:end -->

## 功能

- 🔖 **快速添加书签** - 一键将当前页面添加到导航站
- 🔍 **快速搜索** - 在弹窗中搜索已有书签
- 📋 **书签列表** - 展示书签列表，点击快速跳转

## 支持浏览器

- Chrome / Edge (Manifest V3)
- Firefox (Manifest V2)

## 安装方法

扩展已按独立客户端模型收口：主站不会再下发预配置 ZIP，也不会再自动注入部署地址、引导码或登录态。

仓库内默认保留两个可直接下载的压缩包：

- [Chrome / Edge 下载包](packages/starnav-extension-chrome.zip)
- [Firefox 下载包](packages/starnav-extension-firefox.zip)

源码有更新并 **git commit** 时，pre-commit 会自动 `npm run extension:package` 并暂存 `packages/*.zip`。也可手动：

```bash
npm run extension:package
```

如果你是本地开发，或想重新生成下载包对应的未压缩安装目录，再导出两个可直接加载的安装目录：

```bash
npm run extension:export
```

命令会生成：

- `clients/extension/dist/chrome`
- `clients/extension/dist/firefox`

### Chrome / Edge

1. 打开 `chrome://extensions/` 或 `edge://extensions/`
2. 开启「开发者模式」
3. 下载并解压 [Chrome / Edge 下载包](packages/starnav-extension-chrome.zip)
4. 点击「加载已解压的扩展程序」
5. 选择解压后的扩展目录，或本地导出的 `clients/extension/dist/chrome` 文件夹

### Firefox

下载包或导出目录里的 `manifest.json` 都已自动准备好，不需要再手动改名。

1. 打开 `about:debugging#/runtime/this-firefox`
2. 下载并解压 [Firefox 下载包](packages/starnav-extension-firefox.zip)
3. 点击「临时载入附加组件」
4. 选择解压后的 `manifest.json`，或本地导出的 `clients/extension/dist/firefox/manifest.json`

## 配置

1. 安装后会自动打开设置页面
2. 输入您部署的 StarNav 服务器地址（如 `https://nav.example.com`）
3. 首次连接时浏览器会请求**仅该站点**的访问权限（不再默认申请 `<all_urls>`）
4. 输入账号密码并登录（扩展走 **`POST /api/login` 返回的 Bearer JWT**，不依赖主站 HttpOnly Cookie）
5. 点击浏览器工具栏上的图标即可使用

快捷能力：

- 右键菜单「Add page to StarNav」：把当前页/链接写入待添加队列并打开 popup
- `Alt+Shift+S`：打开扩展 popup
- `Alt+Shift+A`：添加当前页面
- popup / 设置页支持日/夜模式切换

认证说明：主站 Web 管理端优先 Cookie、Bearer 回退；扩展与脚本客户端应始终带 `Authorization: Bearer <token>`。详见 `docs/ARCHITECTURE.md` 的 Auth and session model。

共享 `src/shared` 变更后请在仓库根执行：

```bash
npm run extension:sync-common
npm run extension:sync-common:check
```

## 仓库拆分准备

当前目录已经不再依赖主站打包/引导链路，后续拆成独立仓库时，最少只需要迁移：

- `clients/extension/` 整个目录
- 对应的测试 `tests/extension/`
- 如需保留一键安装目录导出，再迁移 `scripts/extension/export-extension-bundles.mjs`
- 如需保留真实浏览器 E2E，再迁移 `scripts/quality/browser-extension-e2e.mjs`

主站仓库只保留通用 `/api` 能力，不再承担扩展交付职责。

## 开发

```bash
# 手动打包（提交扩展源码时一般会自动跑）
npm run extension:package

# 导出 Chrome / Firefox 安装目录
npm run extension:export

# 真实浏览器扩展 E2E
# 覆盖 raw unpacked 首装/登录/401/错误分支与 popup/options 核心流程
npm run test:browser:extension

# 目录结构
clients/extension/
├── dist/                 # 导出的安装目录（chrome / firefox）
├── manifest.json           # Chrome/Edge 配置
├── manifest.firefox.json   # Firefox 配置（由 versions:sync 生成）
├── common/                 # 扩展内共享 API 工具
├── popup/                  # 弹窗界面
├── options/                # 设置页面
├── background/             # 后台脚本
└── icons/                  # 图标资源
```

## 图标

请在 `icons/` 目录下放置以下尺寸的图标：

- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

可使用在线工具从主 Logo 生成各尺寸图标。
