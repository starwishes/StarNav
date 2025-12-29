# StarNav Browser Extension

浏览器扩展插件，快速添加书签到 StarNav 导航站。

## 功能

- 🔖 **快速添加书签** - 一键将当前页面添加到导航站
- 🔍 **快速搜索** - 在弹窗中搜索已有书签
- 📋 **书签列表** - 展示书签列表，点击快速跳转

## 支持浏览器

- Chrome / Edge (Manifest V3)
- Firefox (Manifest V2)

## 安装方法

### Chrome / Edge

1. 打开 `chrome://extensions/` 或 `edge://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `browser-extension` 文件夹

### Firefox

1. 将 `manifest.firefox.json` 重命名为 `manifest.json`（备份原文件）
2. 打开 `about:debugging#/runtime/this-firefox`
3. 点击「临时载入附加组件」
4. 选择 `manifest.json` 文件

## 配置

1. 安装后会自动打开设置页面
2. 输入您部署的 StarNav 服务器地址（如 `https://nav.example.com`）
3. 登录您的账号
4. 点击浏览器工具栏上的图标即可使用

## 开发

```bash
# 目录结构
browser-extension/
├── manifest.json           # Chrome/Edge 配置
├── manifest.firefox.json   # Firefox 配置
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
