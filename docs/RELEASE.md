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

## 2. 自动发布（Docker 镜像，无 GitHub Releases）

**不再自动创建 GitHub Release 页面。** 交付以 Docker 镜像为准。

统一链路：

1. [CI](../.github/workflows/ci.yml)
   - 使用 [`.nvmrc`](../.nvmrc) 指定的 Node 24
   - `lint:ops` / `audit:prod` / coverage / runtime smoke / `build` / `docker:smoke`
2. [Release](../.github/workflows/release.yml)（CI 在 `main` 上 **push 成功后**，或手动 `workflow_dispatch`）
   - **不**调用 `gh release create`
   - 读取 `package.json` 的 `version`
   - **仅在下列情况** 触发 Docker Publish：
     - 相对上一提交，`package.json` **版本号发生了变化**；或
     - 该版本还没有任何一次成功的 `Docker Publish vX.Y.Z`（版本已 bump 但上次镜像失败/未跑完时的补发）；或
     - 手动 Run workflow（可带 version / source_ref / force）
   - 普通插件/文档提交、版本未变且镜像已发过 → **跳过**，不会刷镜像
3. [Docker Publish](../.github/workflows/docker-publish.yml)
   - 由 Release workflow `workflow_dispatch` 调起，传入 `version` + `source_ref`（通常为通过 CI 的 commit SHA）
   - `release.published` 仅作「你手工建了 GitHub Release」时的可选兜底，日常不用
   - 推送多架构镜像到 `ghcr.io`；配置了 Docker Hub secrets 时再推 Hub

清理历史 GitHub Release（可选）：

```bash
gh release list --repo starwishes/StarNav
gh release delete v1.0.0 --repo starwishes/StarNav --yes
```

## 3. Version Source Of Truth

当前约定：

- 版本号来源：`package.json`
- Docker 镜像 tag：与 `package.json` version 一致，并额外打 `major.minor`、`major`、`latest`
- **不依赖** GitHub Release / git tag 作为发镜像前提
- `docs/archive/CHANGELOG.md` 保留为历史归档

发新镜像的操作：

1. 改 `package.json` / `package-lock.json` 顶层 `version`（例如 `1.0.0` → `1.0.1`）
2. `npm run versions:sync`（同步 README / 扩展 manifest 等）
3. `npm run versions:check`
4. 合并进 `main` → CI 绿 → Release 工作流发现版本变了 → 自动 Docker Publish

同版本修 bug、不改 `package.json` version → **不会**自动重打镜像；需要时 Actions → Release / Docker Publish 手动跑。

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
