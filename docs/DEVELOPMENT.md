# StarNav 开发者文档

## 🚀 快速开始

### 环境要求

- **Node.js**: 24.x LTS（与 `Dockerfile`、`CI` 和 release workflow 对齐）
- **npm**: 10.x 或更高版本
- **Git**: 用于版本控制

### Windows 与 WSL 工具链隔离

仓库在 Windows 盘（如 `D:\...`）上开发时，**默认使用 Windows 工具链**，不要和 WSL 混用同一套二进制 / `node_modules`：

| 环境    | Node                                | 用途                                       |
| ------- | ----------------------------------- | ------------------------------------------ |
| Windows | Scoop / 本机 Node 24（见 `.nvmrc`） | 日常 `npm run serve                        | dev | test:* | build` |
| WSL     | 发行版内 fnm/nvm 的 Node 24         | 仅 Linux 侧脚本或需要 Linux 原生绑定的工作 |

硬性约定：

1. 不要用 WSL 改写 Windows 安装目录下的 `node.exe`（例如 `/mnt/d/Programs/Scoop/...`）
2. 不要用 WSL Node 去跑 Windows 检出目录里的 `node_modules`（原生绑定平台不匹配）
3. 文本行尾以仓库 `.gitattributes` 为准（默认 **LF**）；shell 脚本必须是 LF

### 本地开发环境设置

#### 1. 克隆代码库

```bash
git clone https://github.com/your-org/StarNav.git
cd StarNav
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，根据需要修改配置：

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=yourpassword
JWT_SECRET=your-random-secret-key-at-least-32-chars
NODE_ENV=development
PORT=3333
CORS_ORIGINS=
```

> **提示**: 开发环境可以使用简单的密码，但生产环境务必使用强密码和随机 JWT_SECRET。

#### 4. 启动开发服务器

**方式一：分别启动前后端**

终端 1 - 启动后端服务：

```bash
PORT=3333 NODE_ENV=development npm run serve
```

终端 2 - 启动前端开发服务器：

```bash
npm run dev
```

**方式二：使用 Docker Compose（推荐）**

```bash
# 生产形态本地演练（需已配置 .env）
npm run docker:build
npm run docker:smoke
# 或：docker compose --project-directory . -f docker/docker-compose.yml up -d
```

#### 5. 访问应用

- **前端**: http://localhost:8080
- **后端 API**: http://localhost:3333/api
- **API 文档**: http://localhost:3333/api-docs
- **健康检查**: http://localhost:3333/api/health

---

## 📁 项目结构

```text
StarNav/
├── src/
│   ├── web/                 # Vue 3 + Vite SPA
│   ├── server/              # Express API、服务层、工具
│   └── shared/              # 前后端共享契约与工具
├── server.ts                # 进程入口（tsx）
├── clients/extension/       # 扩展客户端（独立打包）
├── tests/                   # server|web|shared|extension|tools|integration|smoke (+ setup/shims)
├── docker/                  # Dockerfile / compose / entrypoint
├── config/                  # commitlint / lint-staged
├── docs/                    # 见 docs/README.md
├── scripts/                 # docker|extension|openapi|release|quality
├── data/                    # SQLite 与上传（运行时）
├── package.json
├── vite.config.ts
└── tsconfig.json / tsconfig.server.json
```

---

## 🛠 开发工具链

### 代码规范

项目使用 **ESLint** 和 **Prettier** 保证代码质量：

```bash
# 运行 Lint 检查
npm run lint

# 运行 shell / Dockerfile 检查
npm run lint:ops

# 运行生产依赖安全检查
npm run audit:prod

# 自动修复 Lint 错误
npm run lint:fix

# 格式化代码
npm run format
```

### Git Hooks

项目使用 **Husky** 和 **lint-staged** 在提交时自动执行检查：

- **pre-commit**: 自动执行 `eslint --fix` 和 `prettier --write`
- **commit-msg**: 检查提交消息是否符合 [Conventional Commits](https://www.conventionalcommits.org/) 规范

### 提交消息规范

使用 Conventional Commits 格式：

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**类型（type）**：

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建工具或辅助工具变动

**示例**：

```bash
git commit -m "feat(bookmarks): 添加批量导出功能"
git commit -m "fix(auth): 修复 JWT token 过期处理逻辑"
git commit -m "docs: 更新 API 文档"
```

---

## 🧪 测试

### 单元测试（Vitest）

```bash
# 运行全部 Vitest 用例
npm run test

# 运行无端口快速回归
npm run test:fast

# 运行无端口 coverage 回归并生成 coverage/ 报告
npm run test:coverage

# 运行无端口应用级 smoke
npm run test:smoke:app

# 运行真实运行时 smoke（会监听本地端口）
npm run test:smoke:runtime

# 仅运行真实浏览器扩展 E2E（含首装、错误分支、401 失效、重复添加、打包 ZIP 产物）
npm run test:browser:extension

# 查看按域/层级聚合的测试覆盖面统计
npm run test:stats

# 监听模式（文件变化时自动运行）
npm run test -- --watch
```

### 依赖与镜像基线

- 生产依赖安全基线入口是 `npm run audit:prod`；当前 `package.json` 里的 overrides 用来固定已知高风险传递依赖的安全版本。
- `npm audit` 关注的是依赖安全，不能代替构建产物验证；像 `vite-plugin-pwa`、`workbox-build`、`swagger-jsdoc` 这类构建/诊断链路升级后，至少还要补跑 `npm run build`、`npm run test:browser`、`npm run docker:smoke`。
- Swagger 文档链路属于非生产诊断面：`swagger-jsdoc` / `swagger-ui-express` 只在非生产环境用于 `/api-docs` 和 `/api-docs.json`，真实兼容性应通过对应测试和非生产启动验证，而不是把它视为生产运行时依赖。
- 书签/分类读写直接使用 `bookmarkReadService` / `bookmarkWriteService` / `categoryReadService` / `categoryWriteService`；`BookmarkManager` / `CategoryManager` 兼容 facade 已删除。
- 本地执行 `npm run docker:build` / `npm run docker:smoke` 时，脚本默认走 Debian 官方源、**不会**自动切换镜像源；如网络受限可显式传 `APT_DEBIAN_MIRROR` / `APT_DEBIAN_SECURITY_MIRROR` 指向镜像站（例如 TUNA 的 HTTP Debian 镜像 `http://mirrors.tuna.tsinghua.edu.cn/debian` / `http://mirrors.tuna.tsinghua.edu.cn/debian-security`）；`CI` / `GITHUB_ACTIONS` 环境同样不注入镜像源。
- Docker 构建默认固定到 `node:24.14.1-slim`，如需做受控升级，可在本地显式覆盖：

```bash
NODE_IMAGE=node:24.15.0-slim npm run docker:build
NODE_IMAGE=node:24.15.0-slim npm run docker:smoke
```

---

## 🐛 调试指南

### 后端调试

#### 方法一：使用 Node.js Inspector

```bash
node --import tsx --inspect server.ts
```

然后在 Chrome 中打开 `chrome://inspect`，点击 "Open dedicated DevTools for Node"。

#### 方法二：VSCode 调试

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server.ts",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

按 F5 启动调试。

#### 方法三：启用详细日志

在 `src/server/utils/logger.ts` 中调整日志级别（默认为 INFO）：

```bash
# 启用 DEBUG 级别日志
LOG_LEVEL=4 PORT=3333 NODE_ENV=development tsx server.ts
```

日志级别：

- 1: ERROR
- 2: WARN
- 3: INFO
- 4: DEBUG

### 前端调试

#### Vue DevTools

安装 [Vue DevTools 浏览器扩展](https://devtools.vuejs.org/)，可以查看：

- 组件树
- Pinia 状态
- 路由信息
- 性能分析

#### 浏览器控制台

在代码中使用 `console.log()` 输出调试信息（开发环境不会被移除）。

### 数据库调试

#### 查看数据库内容

```bash
# 使用 SQLite 命令行工具
sqlite3 data/starnav.db

# 查看所有表
.tables

# 查看表结构
.schema categories

# 查询数据
SELECT * FROM users;

# 退出
.quit
```

#### 重置数据库

```bash
# 删除数据库文件
rm -f data/starnav.db

# 重启服务器，会自动创建新数据库
PORT=3333 NODE_ENV=development tsx server.ts
```

---

## 📦 构建和部署

### 生产构建

```bash
# 构建前端
npm run build

# 构建结果在 dist/ 目录
```

### Docker 构建

```bash
# 构建镜像
docker build -t starnav:latest .

# 运行容器
docker run -p 8080:8080 -v $(pwd)/data:/app/data starnav:latest
```

### 部署检查清单

- [ ] 修改 `JWT_SECRET` 为随机字符串（至少 32 字符）
- [ ] 设置强密码 `ADMIN_PASSWORD`
- [ ] 配置 `CORS_ORIGINS` 为具体域名
- [ ] 启用 HTTPS（使用 Nginx 反向代理 + Let's Encrypt）
- [ ] 定期备份 `data/starnav.db` 文件
- [ ] 监控日志文件大小
- [ ] 配置健康检查 `/api/health`

---

## 🔧 常用命令速查

### 开发

```bash
npm run dev                 # 启动前端开发服务器
PORT=3333 tsx server.ts    # 启动后端服务器（开发态）
npm run lint                # 运行 Lint 检查
npm run format              # 格式化代码
```

### 测试

```bash
npm test                    # 运行全部 Vitest 用例
npm run test:fast           # 无端口快速回归
npm run test:coverage       # 生成真实 coverage 报告并校验阈值
npm run test:smoke:app      # 无端口应用级 smoke
npm run test:smoke:runtime  # 真实运行时 smoke
npm run test:stats          # 输出按域/层级聚合的测试覆盖面统计
```

### 构建

```bash
npm run build               # 构建生产版本
npm run preview             # 预览构建结果
```

### 数据库

```bash
sqlite3 data/starnav.db     # 打开数据库
sqlite3 data/starnav.db .dump > backup.sql  # 导出数据
```

### Docker

```bash
docker-compose up -d        # 启动服务
docker-compose logs -f      # 查看日志
docker-compose down         # 停止服务
docker-compose build        # 重新构建
```

---

## 🤝 贡献与治理

[`docs/CONTRIBUTING.md`](./CONTRIBUTING.md) 现在是默认协作入口，统一定义：

- Node / npm 基线
- Conventional Commits 约定
- 文档同步规则
- 按改动类型选择验证命令的矩阵
- PR 必填信息与风险说明

提交 PR 前，优先按 [`CONTRIBUTING.md`](./CONTRIBUTING.md) 的验证矩阵执行最小充分检查；涉及发布、部署、Docker 或运行时链路时，再分别参考 [`RELEASE.md`](./RELEASE.md) 与 [`OPERATIONS.md`](./OPERATIONS.md)。

---

## 📚 相关资源

- **Vue 3**: https://vuejs.org/
- **Vite**: https://vitejs.dev/
- **Express**: https://expressjs.com/
- **SQLite**: https://www.sqlite.org/
- **Better SQLite3**: https://github.com/WiseLibs/better-sqlite3
- **Playwright**: https://playwright.dev/
- **Vitest**: https://vitest.dev/

---

## ❓ 常见问题

### Q: 如何重置管理员密码？

A: 在 `docker/docker-compose.yml` 或 `.env` 中设置 `ADMIN_PASSWORD` 环境变量，重启服务器即可。

### Q: 数据库文件在哪里？

A: 默认位置是 `data/starnav.db`。可以通过 `DATA_PATH` 环境变量修改。

### Q: 如何启用生产环境？

A: 设置环境变量 `NODE_ENV=production`。

### Q: 前端热更新不生效？

A: 确保前端开发服务器（port 8080）正在运行，并且浏览器访问 http://localhost:8080（不是 3333）。

### Q: API 请求 CORS 错误？

A: 检查 server.ts 中的 CORS 配置，确保开发环境允许 `http://localhost:8080`。

---

**最后更新**: 2026-04-14
