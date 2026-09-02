# StarNav 运维手册

这份手册只覆盖实际交付最常用的动作：部署、启动、首登、健康检查、备份、恢复、升级与冒烟验证。

## 1. 部署策略

- StarNav 可以直接跑在 HTTP 上，适合内网、测试机和未接入 TLS 的单机环境。
- 生产环境仍推荐 HTTPS，尤其是公网暴露后台时。
- 服务端已开启 `trust proxy`。如果你在 Nginx / Caddy / Traefik 等反向代理后面终止 TLS，请确保透传 `X-Forwarded-Proto`，这样 Web 管理端 Cookie 会自动带上 `Secure`。
- 如果你明确知道当前环境必须强制启用或禁用 Cookie `Secure`，可以设置：

```bash
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SECURE=false
```

- 如果不设置 `AUTH_COOKIE_SECURE`，StarNav 会按请求协议自动判断。
- Helmet 的 `upgrade-insecure-requests` 默认关闭；只有在站点内引用的图片、图标和其他外部资源都已支持 HTTPS 时，才建议显式开启：

```bash
CSP_UPGRADE_INSECURE_REQUESTS=true
```

- 反向代理最少确认三件事：
  1. 转发 `Host`
  2. 转发 `X-Forwarded-Proto`
  3. `CORS_ORIGINS` 配置为实际访问域名，而不是 `*`；未配置时生产环境不会再回退 `localhost` 跨域白名单

- **`TRUST_PROXY` 默认开启（信任一层反向代理）**：限流（登录、写操作、公开点击接口）与会话/审计日志均按 `req.ip` 计数，默认从 `X-Forwarded-For` 读取真实客户端 IP。请确认反代正确透传 `X-Forwarded-For`。**仅当应用端口直连公网（无受信任反代）时**，建议显式设置 `TRUST_PROXY=false`，避免客户端伪造 `X-Forwarded-For` 头绕过按 IP 的限流。
- **多跳代理（如 Cloudflare → Nginx → 应用）**：当前 `trust proxy` 固定为 `1`（`server.ts` 中 `app.set('trust proxy', ...)`），只信任一跳——`req.ip` 会取 `X-Forwarded-For` 里**倒数第二跳**的地址（即离应用最近的那个反代出口，而不是真正的客户端 IP）。如需精确真实 IP，Express 支持把 `trust proxy` 配置为可信代理 IP 列表/子网（当前实现未做区分）；在保持现状的前提下，请至少确认离应用最近的一跳反代由你方可信控制并正确透传 `X-Forwarded-For`，否则基于 IP 的限流/审计仍可能被间接污染。
- **Cloudflare（或带专用客户端 IP 头的 CDN）**：Cloudflare 到源站的 socket 是 CF 边缘 IP，真实客户端 IP 在 `CF-Connecting-IP` 头（CF 会丢弃并重写客户端伪造值）。应用**默认自动识别**：当连接对端落在 Cloudflare 官方网段内时采信 `CF-Connecting-IP`，限流分桶 / 会话 / 审计 IP 显示真实客户端 IP，无需任何配置。直连源站 IP 的请求对端不在 CF 网段，伪造头不被采信（内置网段表来自 cloudflare.com/ips，官方增补时请同步 `src/server/utils/cloudflareIp.ts`）。其他 CDN 用专用头时设 `REAL_CLIENT_IP_HEADER=<头名>`（显式配置优先于自动 CF 检测）。

## 2. 启动方式

### 本地 / WSL

```bash
npm install
npm run build
PORT=8080 NODE_ENV=production tsx server.ts
```

### Docker Compose

```bash
cp .env.example .env
docker-compose pull
docker-compose up -d
docker-compose logs -f nav
```

启动后优先检查：

- `GET /api/health`
- `GET /api-docs.json`（生产默认 404——需设 `API_DOCS_PUBLIC=true` 才公开；本地开发环境不受此限）

如果要先验证镜像本身，而不是直接启动正式容器：

```bash
npm run docker:smoke
```

## 3. 首次管理员登录

- 推荐显式设置 `ADMIN_PASSWORD` 后再启动，避免在生产环境里等待随机密码落盘。
- 如果没有设置 `ADMIN_PASSWORD`，StarNav 默认会把一次性管理员密码写到 `DATA_PATH/.admin_bootstrap_password`。
- 如需在受控环境里直接从 `docker logs` 取密码，可临时设置：

```bash
ADMIN_BOOTSTRAP_PASSWORD_DELIVERY=log
ADMIN_BOOTSTRAP_PASSWORD_DELIVERY=both
```

- `file` 是默认值；`log` 会把明文初始密码写入启动日志；`both` 会同时写日志和受限文件。生产环境不建议长期启用 `log` 或 `both`。
- 读取时不要直接 `cat`，统一使用：

```bash
npm run admin:bootstrap-password
```

该命令会输出密码并立即删除密码文件。

## 4. 健康检查与最小冒烟

### 最小验收路径（推荐顺序）

交付或升级后，按从轻到重选择：

| 顺序 | 命令                                                                | 覆盖                                     |
| ---- | ------------------------------------------------------------------- | ---------------------------------------- |
| 1    | `npm run docker:smoke`                                              | 镜像构建 + 容器内健康/基本可用性         |
| 2    | `curl http://127.0.0.1:8080/api/health`                             | 运行中实例存活                           |
| 3    | `npm run admin:bootstrap-password`（仅首登且未设 `ADMIN_PASSWORD`） | 取出并销毁一次性管理员密码               |
| 4    | `npm run test:smoke`                                                | 隔离进程 API 冒烟（登录/会话/书签/上传） |
| 5    | `npm run db:backup` / `npm run db:restore -- --input <path>`        | 备份恢复演练（变更前建议先 4）           |
| 6    | `npm run test:browser`（可选）                                      | 主站 Playwright 回归                     |

CI 已覆盖 typecheck、audit:prod、coverage、runtime smoke、build、docker:smoke；本地改动优先 `npm run typecheck` + `npm run test:fast`。

### WSL 手动仿真（100 书签）

本机 Windows 若无 Docker CLI，可在 **WSL** 使用已构建镜像做本地验收（与 Windows Node 工具链隔离）：

```bash
# 1) 需要镜像 starnav:smoke（可先 npm run docker:smoke 或 docker build -f docker/Dockerfile -t starnav:smoke .）
# 2) 启动容器；脚本用 realisticBookmarkDataset 生成种子 JSON 再导入（默认 100 条，不提交 fixtures）
cd /mnt/d/Project/CodeProject/StarNav   # 按实际挂载路径调整
sh scripts/docker/run-manual-demo.sh

# 可选：SEED_COUNT=1000 sh scripts/docker/run-manual-demo.sh
# 可选：FIXTURE=/path/to/backup.json sh scripts/docker/run-manual-demo.sh
```

默认：

- URL：`http://127.0.0.1:8080`
- 账号：`admin` / 脚本内 `ADMIN_PASSWORD`（与 `.env.example` 示例一致，仅本地）
- 数据目录：`data/manual-demo`（挂载到容器 `/app/data`；生成的 seed JSON 也落在此目录）
- 种子：`tsx src/server/tools/realisticBookmarkDataset.ts` → 10 分类 + 100 书签（`SEED_COUNT` 可改）

停止：`docker stop starnav-manual-demo`；删除容器：`docker rm -f starnav-manual-demo`（数据目录可保留）。

**重建镜像后后台转圈：** 常见原因是浏览器仍挂着旧 Service Worker，首页壳子旧、懒加载的 `AdminDashboard-*.js` 哈希已变。应用会在 `vite:preloadError` 时自动注销 SW 并清理 Cache 后重载一次；若仍异常，在开发者工具 → Application → 注销 Service Workers / Clear site data，再硬刷新。

### 镜像变体

- 默认交付：`docker/Dockerfile`（`npm run docker:build` / `docker:smoke`）
- 精简实验：`docker/Dockerfile.runtime-min`（更小 runtime 基底；需单独 build，不作为 compose 默认镜像）

### 健康检查

```bash
curl http://127.0.0.1:8080/api/health
```

### 最小冒烟

```bash
npm run test:smoke
```

这组 smoke 会实际起一个隔离实例，并覆盖：

- 健康检查
- 管理员登录
- Cookie 会话读取与受保护写请求
- Cookie 写请求来源校验
- 分类创建 / 更新
- 书签创建 / 搜索 / 删除
- 图标 / 背景上传
- 登出与会话失效

如果要做正式浏览器回归，而不只是 API smoke：

```bash
npm run test:browser
```

这条命令现在只覆盖主站 Web 回归，会启动一个隔离生产实例，并用 Playwright 容器覆盖：

- 首页渲染
- 登录弹窗与管理员登录
- 后台设置保存
- 上传并应用背景 / favicon / logo
- 刷新后 Cookie 会话保持
- 登出

如果还要单独验证当前仓库里的独立浏览器扩展客户端：

```bash
npm run test:browser:extension
```

如果想把 Web 与扩展都跑一遍：

```bash
npm run test:browser:all
```

`test:browser:extension` 会覆盖首装未配置、options 连接测试/登录保存/401 失效，以及 popup 搜索/编辑/删除/重复添加检测/创建分类/添加当前页面。

如果只想先跑一条不依赖真实端口监听的轻量 smoke：

```bash
npm run test:smoke:app
```

## 5. 备份

### 手动备份

```bash
npm run db:backup
```

默认会在 `DATA_PATH/backups/` 下生成时间戳备份文件，例如：

```text
data/backups/starnav-2026-04-12T18-30-00-000Z.db.bak
```

也可以显式指定输出路径：

```bash
npm run db:backup -- --output /srv/backups/starnav-nightly.db.bak
```

### 自动备份

- 写侧操作前会生成快速回滚备份 `starnav.db.bak`
- 启动后会注册每日凌晨定时备份任务

## 6. 恢复

恢复前请确保服务已经停止，或至少当前没有并发写入。

```bash
npm run db:restore -- --from /srv/backups/starnav-nightly.db.bak
```

恢复动作会做两件事：

1. 用指定备份覆盖当前 `starnav.db`
2. 先为当前数据库生成一份“恢复前快照”到 `DATA_PATH/backups/`

恢复完成后建议立刻执行：

```bash
curl http://127.0.0.1:8080/api/health
npm run test:smoke
```

## 7. 升级

建议的最小升级顺序：

```bash
git pull
npm install
npm run build
npm run test:fast
npm run test:smoke
npm run test:browser
```

生产环境升级前再做一次手动备份：

```bash
npm run db:backup
```

如果本次升级涉及 Docker 镜像或运行时依赖，再补一条：

```bash
npm run docker:smoke
```

### Compose 部署与回滚

如果当前就是通过仓库 `docker/docker-compose.yml` 交付，推荐直接走脚本化部署：

```bash
STARNAV_TAG=2.2.8 npm run deploy:compose
```

这条命令会顺序执行：

1. 备份当前数据库到 `data/releases/deploy-*.db.bak`
2. 拉取目标镜像
3. `docker compose up -d nav`
4. 轮询 `http://127.0.0.1:${STARNAV_PORT:-8080}/api/health`
5. 如果失败，自动停服务、恢复备份库，并切回上一版镜像

如果要手动回滚到上一个成功版本：

```bash
npm run rollback:compose
```

当前部署状态会写到 `data/releases/current.env`。如果你只是演练命令而不想真正变更环境，可加 `DRY_RUN=1`。

## 8. 压测

统一入口：

```bash
npm run test:performance:bookmarks
```

- 如果本机安装了 `k6`，脚本会直接调用本机 `k6`
- 如果没有安装 `k6` 且当前在 Linux / WSL，会自动回退到 `grafana/k6` Docker 镜像

更详细的参数和基线结果见 [PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md)。

## 9. 发布

本地发布演练和 GitHub 自动发布流程见 [RELEASE.md](./RELEASE.md)。
