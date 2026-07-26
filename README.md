# StarNav

可私有化部署的个人导航：Vue 3 + Express + SQLite，单进程（`server.ts`）。

<!-- version-sync:start -->

## 当前版本

- 主站：`v1.0.0`
- 浏览器扩展：`v1`
<!-- version-sync:end -->

## 快速开始

```bash
# Docker
cp .env.example .env          # 编辑 .env，优先设置 ADMIN_PASSWORD
docker compose --project-directory . -f docker/docker-compose.yml up -d --build
# → http://localhost:8080

# 本地开发
npm install
npm run serve          # API / 生产态入口，默认端口见 .env
npm run dev            # Vite 前端，默认 http://localhost:5173

# 生产构建后运行
npm run build && npm run serve
```

管理员默认用户名 `admin`。**优先在 `.env` 设置 `ADMIN_PASSWORD`**；未设置时才会生成一次性文件 `data/.admin_bootstrap_password`，用 `npm run admin:bootstrap-password` 读取后即删。数据默认 `data/starnav.db`。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run test:fast` | 默认单测 |
| `npm run typecheck` | 前后端类型检查 |
| `npm run lint:check` | ESLint |
| `npm run docker:smoke` | 镜像冒烟 |
| `npm run extension:package` | 打包浏览器扩展 |
| `npm run db:backup` / `db:restore` | 数据库备份恢复 |

更多：`docs/README.md` · 协作约束 `AGENTS.md`

## 目录

```text
src/{web,server,shared}   # 主应用
clients/extension/        # 独立浏览器扩展
tests/                    # server|web|shared|extension|tools|integration|smoke|…
scripts/                  # docker|extension|openapi|release|quality
docker/  docs/  config/   # 交付、文档、工具配置
server.ts                 # 进程入口
```

扩展安装包：[Chrome/Edge](clients/extension/packages/starnav-extension-chrome.zip) · [Firefox](clients/extension/packages/starnav-extension-firefox.zip)
