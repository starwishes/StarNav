# 星语导航 (StarNav) v1.5.0

一个极简、美观、功能强大的个人/私有导航系统。
A minimalist, beautiful, and powerful personal/private navigation system.

**本项目基于开源项目 [CloudNav](https://github.com/sese972010/CloudNav) 进行深度开发与重构，旨在提供更完善的用户权限管理与更精致的 UI 体验。**

[![Version](https://img.shields.io/badge/version-1.5.0-blue.svg)](https://github.com/starwishes/Nav)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Vue](https://img.shields.io/badge/vue-3.4.29-brightgreen.svg)](https://vuejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)

---

## ✨ 核心特性 (Core Features)

| 特性维度 | 功能亮点 |
| :--- | :--- |
| 🎨 **极致视觉** | 适配 **Glassmorphism (毛玻璃)** 设计语言，支持响应式布局、动态背景切换及暗色模式。 |
| 🔍 **智能搜索** | **双模检索**：毫秒级本地书签模糊搜索（相关度排序） + 自定义搜索引擎集群。 |
| 🎭 **多级权限** | 严密的 **RBAC** 权限模型：支持游客到超级管理员的 4 级隔离，实现分类/书签的精细化可见性控制。 |
| 👤 **用户生态** | 完备的账号管理：支持开放注册开关、个人资料维护、以及管理员视角的全局资产权限调度。 |
| 🔒 **硬核安全** | **v1.5.0 专项补丁**：BCrypt 算法哈希、JWT 自动轮换秘钥、危险默认密码强制重置拦截、API 限流。 |
| 🚀 **生产就绪** | 极简 Docker 镜像部署，内置数据迁移保护与语义化操作日志记录，确保运维高信噪比。 |

### 🆕 v1.5.0 重大更新 (2025-12-29)

- 🛡️ **安全加固：管理员初始化逻辑强化**：支持通过 `ADMIN_PASSWORD` 注入密码；如果使用默认密码 `admin123`，系统将强制生成高强度随机密码并输出到 Docker 日志，极大提升首屏安全性。
- 🧹 **日志精简**：优化后端请求日志，自动过滤 `/api/favicon`、`/api/settings` 及静态资源等高频非关键日志，保持 Docker 日志清爽。
- 🛠️ **版本同步**：全站版本升级至 v1.5.0。

### 🆕 v1.3.5 更新摘要 (2025-12-29)

- ⚡ **性能重构**：前端后台实施组件懒加载 (Lazy Loading)；后端全面迁移至 MVC 架构。
- 🌍 **国际化增强**：系统提示与错误信息支持全量中英双语。
- 🛡️ **安全防护**：新增全局 API 超频防护 (Rate Limiting)。

### 🆕 v1.3.3 更新摘要 (2025-12-28)

- 🛡️ **数据全量迁移保护**：引入智能迁移引擎。当更新容器或修改管理员名称后，系统会自动检测并搬迁存量数据文件，彻底杜绝“版本升级导致数据丢失”的问题。
- 🔗 **持久化路径精准路由**：重构后端定位逻辑，主管理员数据始终同步至全局可见的 `data.json`。

<details>
<summary>点击查看历史更新记录 (View History)</summary>

### 🆕 v1.3.x 历史优化记录

- 💾 **数据自动同步**：后台所有写操作（增删改、导入）均已改为自动静默同步。
- 📐 **导航栏对称修正**：修复分类导航栏在居中对齐时的物理几何偏移。
- 🔍 **双模式搜索**：集成本地书签与在线搜索引擎。

### 🆕 v1.3.0 更新摘要 (2025-12-28)

- 🔍 **双模式搜索**：单搜索框集成本地书签搜索与在线搜索引擎切换。
- 🎯 **搜索引擎管理**：登录后可自定义添加、编辑、删除、排序搜索引擎。
- 💫 **搜索建议**：在线模式自动获取百度/Google 搜索建议。
- 🌐 **权限优化**：未登录用户可使用在线搜索但不能修改引擎配置。

### 🆕 v1.2.0 更新摘要 (2025-12-24)

- 🚀 **架构重构**：管理后台全面组件化，性能与可维护性飞跃。
- 💎 **视觉升级**：重构全局玻璃态样式，白天模式清晰度大幅提振。
- ☁️ **多时区同步**：首页时钟支持按后台设定的时区显示。
- 📦 **逻辑优化**：导入功能由"覆盖"升级为"智能合并（去重）"。
- 🔗 **路由净化**：全面启用 History 路由并移除首页后缀。

### 📜 v1.1.x 历史功能

- 🏷️ **标签筛选**：首页支持按标签筛选书签，支持多标签组合
- 🔥 **热门访问**：首页展示 Top 10 点击排行
- 🩺 **链接健康检查**：管理后台批量检测无效链接
- 🖼️ **背景图更换**：支持自定义 URL 或本地上传
- 🔐 **JWT Secret 自动生成**：无需手动配置，首次启动自动生成
- 🛡️ **安全增强**：CSP + CORS 配置优化

</details>

## 🚀 快速部署 (Quick Start)

### 1. 编辑 docker-compose.yml

```yaml
services:
  starnav:
    image: starwisher/starnav:latest
    container_name: starnav
    ports:
      - "3333:3333"
    volumes:
      - ./data:/app/data  
    environment:
      - ADMIN_USERNAME=admin # 管理员用户名
      - ADMIN_PASSWORD=admin123 # 管理员密码。注意：若设为默认值 admin123，系统将强制生成随机密码并输出到日志。
      - JWT_SECRET=your-secret-key-here # ⚠️ 必须修改为随机长字符串以保证安全
      # - CORS_ORIGINS=https://your-domain.com # 生产环境设置允许的域名
    restart: always
```

### 2. 启动

```bash
docker-compose up -d
```

访问 `http://localhost:3333` 即可开始使用。

## ⚙️ 系统管理

- **初始管理员**：用户名 `admin`。密码由 `ADMIN_PASSWORD` 指定。若未设置或使用默认值 `admin123`，请在 `docker logs` 中查看随机生成的初始密码。
- **内容可见性**：如果你设置了书签的"所需等级"大于 0，则未登录用户将无法看到该书签。
- **注册开关**：默认注册功能是关闭的，请在后台"系统设置"中开启。

## 📂 项目结构

```text
.
├── backend/             # Node.js + Express 后端
│   ├── routes/          # API 路由接口
│   ├── controllers/     # 业务解析控制器
│   ├── middleware/      # 安全与权限中间件
│   ├── services/        # 数据处理核心逻辑
│   └── config/          # 系统环境变量与常量配置
├── frontend/            # Vue 3 + Vite 前端
│   ├── components/      # 玻璃态 UI 组件库
│   ├── store/           # Pinia 响应式状态管理
│   ├── views/           # SPA 页面路由入口
│   └── locales/         # i18n 多语言包
├── data/                # 持久化存储 (JSON 数据库 & 上传资源)
│   ├── accounts.json    # 加密账户数据
│   ├── data.json        # 导航书签主数据
│   └── settings.json    # 系统运行配置
├── server.js            # 服务端入口 (API + 静态资源托管)
├── Dockerfile           # 多架构镜像构建指令
└── docker-compose.yml   # 容器化一键编排
```

## 📄 开源说明

本项目遵循 MIT 协议开源。欢迎 Star 或贡献代码！
