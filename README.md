# 星语导航 (Nav) v1.0.0

**本项目基于在佬 https://github.com/sese972010/CloudNav-https://github.com/xia-66/nav 的项目上，根据我的个性化需求做了一些修改**

> 一个极简、美观、功能强大的个人导航网站。
> A minimalist, beautiful, and powerful personal navigation website.

[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](https://github.com/xia-66/nav)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Vue](https://img.shields.io/badge/vue-3.4.29-brightgreen.svg)](https://vuejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)


## ✨ 特性 (Features)

- 🎨 **极简设计**：采用 Glassmorphism（毛玻璃）设计风格，界面清新现代。
- 📱 **响应式布局**：完美适配 PC、平板和移动端。
- 🔐 **私有书签**：支持设置“私有”分类和书签，登录后可见，保护隐私。 
- 🛡️ **本地认证**：基于 BCrypt + JWT 的安全认证系统，无需依赖第三方 OAuth。
- 🐳 **Docker 部署**：支持 Docker Compose 一键部署，开箱即用。
- 💾 **数据持久化**：所有数据存储在本地 JSON 文件中，备份迁移方便。
- 🔍 **实时搜索**：支持拼音、关键词实时搜索过滤。
- ⚡ **高性能**：基于 Vue 3 + Vite 构建，加载速度极快。

## 🚀 快速开始 (Docker)

最推荐的部署方式。确保你的机器支持 Docker 和 Docker Compose。

### 1. 启动服务

在项目根目录下，直接运行：

```bash
docker-compose up -d
```

### 2. 访问网站

- **前台首页**: `http://localhost:3000`
- **后台管理**: `http://localhost:3000/#/admin/dashboard` (或点击首页右上角登录)

### 3. 默认账号

- **用户名**: `admin`
- **密码**: `admin123`

> 首次启动后，建议立即在后台修改密码，或者修改 `docker-compose.yml` 环境变量重启。

## ⚙️ 配置说明 (Configuration)

你可以通过修改 `docker-compose.yml` 中的环境变量来自定义配置：

```yaml
environment:
  - PORT=3000                  # 服务端口
  - ADMIN_USERNAME=admin       # 管理员用户名
  - ADMIN_PASSWORD=admin123    # 管理员密码 (启动即加密)
  - JWT_SECRET=your_jwt_secret # JWT 签名密钥
```

## 🛠️ 本地开发 (Local Development)

如果你想二次开发或不使用 Docker：

### 环境要求
- Node.js >= 18.0.0
- NPM / Yarn / Pnpm

### 步骤

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动开发服务器 (前端)**
   ```bash
   npm run dev
   ```

3. **启动后端服务**
   ```bash
   node server.js
   ```
   > 也可以使用 `nodemon server.js` 获得更好的开发体验。

4. **构建生产版本**
   ```bash
   npm run build
   ```

## 📂 项目结构

```
.
├── src/
│   ├── assets/        # 静态资源 (CSS, Images)
│   ├── components/    # Vue 组件
│   ├── config/
│   │   └── data.json  # 核心数据文件 (自动生成/更新)
│   ├── store/         # Pinia 状态管理
│   ├── views/         # 页面视图
│   └── ...
├── server.js          # Express 后端服务
├── Dockerfile         # Docker 构建文件
└── docker-compose.yml # Docker Compose 编排文件
```

## 📄 开源协议

MIT License
