# StarNav 发布流程

这份文档只描述两条统一后的发布路径：

- 本地发布演练
- GitHub 自动发布

## 1. 本地发布演练

先跑完整的交付前检查：

```bash
npm run release:dry-run
```

执行这条命令前，确保本机使用 Node 24。

仓库默认开发、测试、Docker 与发布工具链通过 [`.nvmrc`](../.nvmrc) 与 [`.node-version`](../.node-version) 统一固定为 Node 24。

这个入口会顺序执行：

1. `npm run versions:check`
2. `npm run lint:check`
3. `npm run lint:ops`
4. `npm run audit:prod`
5. `npm run test:fast`
6. `npm run test:smoke`
7. `npm run build`
8. `SKIP_BUILD=1 npm run test:browser`
9. `npm run docker:smoke`
10. 读取 `package.json` 当前版本，检查本地守门项是否齐全；如果同时设置了 `GITHUB_TOKEN` / `GH_TOKEN` 且本机有 `gh`，再顺带检查同名 GitHub Release 是否已存在

其中 `test:fast` 已经排除了真实 runtime smoke，只保留无端口的应用级 smoke；真正会起隔离实例的回归留在 `test:smoke`。
`audit:prod` 只检查生产依赖，不会因为 dev-only 工具链告警而阻断发布演练。
`test:browser` 现在只覆盖主站 Web 回归；如果你在扩展拆仓前还想顺带验证仓库内置的独立扩展客户端，再额外执行 `npm run test:browser:extension` 或 `npm run test:browser:all`。
发布版本现在直接以 `package.json` 的 `version` 为准，而不是再根据提交历史二次推导。

### 本地 Docker 发布演练

如果只想验证容器交付链路：

```bash
npm run docker:build
npm run docker:smoke
```

`docker:smoke` 会：

- 构建或复用本地镜像
- 默认优先用 BuildKit 构建；只有在未显式设置 `DOCKER_BUILDKIT` 且 BuildKit 构建失败时，才自动回退 legacy builder
- 起一个隔离容器
- 等待 `/api/health` 变为可用
- 用显式管理员密码登录，确认主站核心运行链路可用

本地执行 `docker:build` / `docker:smoke` 时，脚本会在未显式传 `APT_DEBIAN_MIRROR` / `APT_DEBIAN_SECURITY_MIRROR` 的情况下默认切到 TUNA 的 HTTP Debian 镜像（`http://mirrors.tuna.tsinghua.edu.cn/debian` / `http://mirrors.tuna.tsinghua.edu.cn/debian-security`）；GitHub Actions 等 `CI` 环境保持不注入镜像源。

默认镜像基线固定为 `node:24.14.1-slim`。如果要验证新的 Node 24 patch 线，可临时覆盖：

```bash
NODE_IMAGE=node:24.15.0-slim npm run docker:build
NODE_IMAGE=node:24.15.0-slim npm run docker:smoke
```

## 2. GitHub 自动发布

统一后的自动发布链如下：

1. [CI](../.github/workflows/ci.yml)
   - 使用 [`.nvmrc`](../.nvmrc) 指定的 Node 24
   - `lint:ops`
   - `audit:prod`
   - `test:stats`
   - `test:coverage`
   - `test:smoke:runtime`
   - `build`
   - `docker:smoke`
2. [Release](../.github/workflows/release.yml)
   - 仅在 `CI` 对 `main` 分支 push 成功后执行
   - 使用 [`.nvmrc`](../.nvmrc) 指定的 Node 24
   - 读取 `package.json` 当前版本
   - 若同名 Release 不存在，则创建 `v<package.json.version>` GitHub Release
   - 若该版本还没有成功过的 Docker Publish，则显式通过 `workflow_dispatch` 补触发一次
3. [Docker Publish](../.github/workflows/docker-publish.yml)
   - 默认由 Release workflow 显式 dispatch，并传入已解析版本号
   - `release.published` 事件仍保留为手工发布 GitHub Release 时的兜底入口
   - 无论由哪条入口触发，都会优先 checkout 对应 release tag，避免同版本重跑时误打 branch head
   - 始终构建并推送多架构镜像到 `ghcr.io`
   - 若配置了 `DOCKER_USERNAME` / `DOCKER_PASSWORD` secrets，再额外推送到 Docker Hub

## 3. Version Source Of Truth

当前约定：

- 版本号来源：`package.json`
- GitHub Release tag：`v<package.json.version>`
- Docker 镜像 tag：与 GitHub Release version 保持一致，并额外发布 `major.minor`、`major`、`latest`
- `docs/archive/CHANGELOG.md` 保留为历史归档，不再作为自动发布的唯一真相源

因此后续如果想发任意版本，就直接在仓库里把 `package.json` / `package-lock.json` 顶层版本设为目标版本号，再执行一次 `npm run versions:sync` 同步 README、Chrome manifest 与生成的 Firefox manifest；交付前用 `npm run versions:check` 兜底校验这些派生产物没有漂移，由 Release workflow 按这个版本创建 Release 和镜像，不再让另一套版本计算逻辑覆盖它。

## 4. 部署默认入口

默认 Compose 文件位于 [docker/docker-compose.yml](../docker/docker-compose.yml)，现在支持：

- `STARNAV_IMAGE`
- `STARNAV_TAG`
- `STARNAV_PORT`
- `.env` 注入运行环境

生产交付时还应显式设置 `CORS_ORIGINS` 为实际访问域名；当前生产默认值不会再回退开发环境的 `localhost` 跨域白名单。

默认镜像来源是：

```text
ghcr.io/starwishes/starnav:latest
```

如需固定版本部署：

```bash
STARNAV_TAG=<release-version> docker-compose up -d
```

如果希望把“备份 DB + 发布 + 健康检查 + 回滚”收口成一个入口，直接使用：

```bash
STARNAV_TAG=<release-version> npm run deploy:compose
```

手动回滚入口：

```bash
npm run rollback:compose
```

部署脚本会把当前运行状态写到 `data/releases/current.env`，并把自动回滚用的数据库备份放在 `data/releases/`。
