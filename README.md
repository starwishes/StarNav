# 星语导航 (StarNav) v1.1.1

一个极简、美观、功能强大的个人/私有导航系统。
A minimalist, beautiful, and powerful personal/private navigation system.

**本项目基于开源项目 [CloudNav](https://github.com/sese972010/CloudNav) 进行深度开发与重构，旨在提供更完善的用户权限管理与更精致的 UI 体验。**

[![Version](https://img.shields.io/badge/version-1.1.1-blue.svg)](https://github.com/starwishes/Nav)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Vue](https://img.shields.io/badge/vue-3.4.29-brightgreen.svg)](https://vuejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)

---

## ✨ 核心特性 (Core Features)

- 🎨 **极致美学**：全站采用 **Glassmorphism（毛玻璃）** 设计风格，支持昼夜模式无缝切换。
- � **多级权限系统 (RBAC)**：
  - **4 级权限**：游客 (0)、注册用户 (1)、VIP 用户 (2)、管理员 (3)；
  - **分级控制**：可为分类或书签设置“最小可见等级”，实现无感内容隔离。
- � **用户系统重构**：
-  **用户系统重构**：
  - **自主注册**：支持管理员一键开关用户注册功能，注册入口动态显示；
  - **账号管理**：管理员可手动添加用户、修改等级、重置密码或删除账号；
  - **个人中心**：用户可自主修改用户名与密码，系统自动同步关联数据。
- 🔒 **全能管理后台**：
  - **全新架构**：侧边栏导航布局，功能模块清晰，支持移动端自适应。
  - **数据控制**：分类管理、书签管理、批量操作、数据导入/导出。
- 🔒 **生产就绪**：
  - **Docker Compose**：一键拉取镜像部署，数据自动持久化。
  - **安全加固**：后端基于 BCrypt 强力加密，JWT 令牌验证，密钥自动生成。

### 🆕 v1.1.1 新功能

- 🏷️ **标签筛选**：首页支持按标签筛选书签，支持多标签组合
- 🔥 **热门访问**：首页展示 Top 10 点击排行
- 🩺 **链接健康检查**：管理后台批量检测无效链接
- �️ **背景图更换**：支持自定义 URL 或本地上传
- 🔐 **JWT Secret 自动生成**：无需手动配置，首次启动自动生成
- 🛡️ **安全增强**：CSP + CORS 配置优化

## �🚀 快速部署 (Quick Start)

### 1. 编辑 docker-compose.yml

```yaml
services:
  starnav:
    image: starwisher/starnav:latest
    container_name: starnav
    ports:
      - "3333:3333"
    volumes:
      - ./src/config:/app/src/config  
    environment:
      - ADMIN_USERNAME=admin  # 管理员用户名
      - ADMIN_PASSWORD=admin123  # 管理员密码
      # - CORS_ORIGINS=https://your-domain.com  # 生产环境设置允许的域名
    restart: always
```

### 2. 启动

```bash
docker-compose up -d
```

访问 `http://localhost:3333` 即可开始使用。

## ⚙️ 系统管理

- **默认账号**：`admin` / `admin123`
- **内容可见性**：如果你设置了书签的“所需等级”大于 0，则未登录用户将无法看到该书签。
- **注册开关**：默认注册功能是关闭的，请在后台“系统设置”中开启。

## 📂 项目结构

```
.
├── src/
│   ├── assets/          # 静态资源 (CSS, SVG Favicon, Fonts)
│   ├── components/      # Vue 3 功能组件 (Dialogs, Tables)
│   ├── config/          # 持久化存储目录
│   │   ├── accounts.json # 账户数据库
│   │   ├── settings.json # 系统全局配置
│   │   ├── data.json     # 默认/管理员数据
│   │   └── users/        # 注册用户独立数据文件
│   └── ...
├── server.js            # Node.js + Express 核心后端
├── Dockerfile           # 多阶段构建 Dockerfile
└── docker-compose.yml   # 容器编排
```

## 📄 开源说明

本项目遵循 MIT 协议开源。欢迎 Star 或贡献代码！
