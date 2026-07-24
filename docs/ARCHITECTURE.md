# StarNav 系统架构

## Runtime shape

StarNav 是单仓、单进程的全栈应用：

- `src/web/` 是 Vue 3 + Vite SPA
- `src/server/` 是 Express API、初始化流程和静态资源托管
- `clients/extension/` 是准备拆到独立仓库的浏览器扩展客户端源码
- `src/shared/` 放前后端共享工具与常量；**领域/envelope 类型**以 `src/shared/types` + `src/shared/api.ts` 为单一来源，前端经 `@/types` re-export

生产环境下，Express 同时负责：

- `/api/**` 业务接口
- `/uploads/**` 上传资源
- `dist/` 构建后的前端静态资源
- SPA fallback

## Build-time vs runtime boundary

需要区分两类依赖和产物：

- 构建期 / 开发期链路：`vite`、`@vitejs/plugin-vue`、`vite-plugin-pwa`、`vite-plugin-compression`、`vitest`、`eslint`、`prettier`
- 非生产诊断链路：`swagger-jsdoc`、`swagger-ui-express`，仅在非生产环境生成和挂载 `/api-docs` / `/api-docs.json`
- 运行时链路：`server.ts`（`tsx`）、`src/server/**/*.ts`、`src/shared/**/*.ts`、生产依赖、SQLite、上传目录，以及已经生成好的 `dist/**`

这意味着：

- PWA 相关依赖只参与 `vite build`，生产环境真正运行的是生成出来的 `dist/sw.js`、`dist/workbox-*.js` 和静态资源
- Swagger 依赖不属于生产镜像运行面的核心能力；它们的真实健康度应通过非生产环境的 `/api-docs.json` 生成验证，而不是靠运行时接口流量间接证明
- 处理构建链依赖升级时，必须至少同时验证 `npm run build`、`npm run test:browser` 和 `npm run docker:smoke`，避免“本地 audit 绿了，但产物链坏了”

## Startup flow

启动入口是 `server.ts`（`npm run serve` → `tsx server.ts`）。应用启动后会先执行 `src/server/services/system/initService.ts`，再挂载中间件和路由。

初始化阶段负责：

1. 环境校验
2. SQLite schema 初始化
3. 旧数据迁移
4. 默认管理员与系统设置初始化
5. 缓存预热和定时任务准备

## Backend layering

### Routes

路由文件位于 `src/server/routes/`：

- `auth.js`: 登录、注册、会话、用户和审计
- `bookmarks.js`: 导航数据、分类、书签、点击统计
- `system.js`: 公共设置、后台设置、健康检查、上传和工具接口
- `stats.js`: PV/UV 与缓存统计

## Auth and session model

- Web 管理端登录成功后，`authController` 会在响应里同时返回 JWT，并下发 HttpOnly Cookie `starnav_auth`
- `src/server/middleware/auth.js` 认证顺序是 Bearer 优先、Cookie 回退，因此浏览器扩展和脚本客户端可作为独立客户端直接登录 `/api/login`
- 对于走 Cookie 的 `POST` / `PUT` / `PATCH` / `DELETE` 请求，后端会额外校验 `Origin` / `Referer` 是否属于当前站点或受信开发来源，用来降低 CSRF 风险

### Controllers

`src/server/controllers/` 负责请求参数、权限边界，并通过 `respondWithService` 输出统一 JSON envelope：成功为 `{ success, message, data }`，错误为 `{ success: false, error, code }`。书签域控制器按读写边界分别委托给 `bookmarkQueryService`、`bookmarkCommandService`，其下再细分到 `bookmarkSnapshotService`、`bookmarkLookupService`、`bookmarkMutationService`。身份域控制器按边界分别委托给 `authLifecycleService`、`sessionAccessService`、`adminIdentityService`。`systemController` 直接委托给 `systemHealthService`、`systemSettingsService`、`systemAssetService`，`toolController` 直接委托给 `toolFaviconService`、`toolLinkCheckService`、`toolSuggestionService`。

### Services

核心业务按域集中在 `src/server/services/`（实现位于子目录；根级 re-export stub 已移除，调用方直接 import 域路径）：

- `bookmark/`：查询/命令编排（`bookmarkQueryService`、`bookmarkCommandService`）、快照与查重、读写底层、`cache.js` 书签快照
- `cache/`：TTL 缓存运行时、键定义、失效（含 `invalidateBookmarkCaches`）、预热
- `database/`：SQLite 连接（`database/database.js`）、路径、schema、维护、统计
- `identity/`：账号、会话、登录/注册、后台用户与审计、bootstrap 管理员
- `system/`：初始化编排、设置、健康检查、资源上传、定时备份
- `tools/`：favicon 代理、链接探测、搜索建议
- 根级仅保留 `migrate.js`（JSON→SQLite 迁移入口；`initService` 与相关测试引用）

## Public settings pipeline

这条链路是前端公共 UI 的基础设施：

1. `src/server/services/system/settingsService.js` 从 SQLite `settings` 表读取公共字段
2. `GET /api/settings` 暴露给未登录用户
3. `src/web/store/config.ts` 作为公共设置单一数据源
4. 首页、背景、时钟、登录弹窗、页头、页脚和侧边栏都从同一个 store 读取

当前公共设置包含：

- `siteName`
- `logoUrl`
- `faviconUrl`
- `backgroundUrl`
- `footerHtml`
- `homeUrl`
- `registrationEnabled`
- `timezone`

## Data and caching

### Database

主数据存储是 `data/starnav.db`，通过 `better-sqlite3` 直接访问。

主要表包括：

- `users`
- `sessions`
- `audit_logs`
- `settings`
- `categories`
- `items`
- `daily_stats`
- `visit_logs`

`items` 表当前已经移除旧版 `tags` 字段，书签组织方式以多级分类为主。

### Cache

项目存在两层缓存：

- `src/server/services/cache/cacheRuntimeService.js` + `src/server/services/cache/cacheService.js`
  面向控制器级响应和统计接口的 TTL 缓存；其中前者承接运行时和统计，后者保留共享运行时入口
- `src/server/services/cache/cacheDefinitionService.js`、`src/server/services/cache/cacheInvalidationService.js`、`src/server/services/cache/cacheWarmupService.js`
  分别承接缓存键/TTL、领域失效、启动预热
- `src/server/services/bookmark/cache.js`
  面向书签与分类快照的驻内存缓存

这个组合让首页数据读取可以尽量避免重复查库；当前由 `bookmarkSnapshotService.getData()` 统一承接测试环境直读和生产环境快照过滤，而 controller 侧 TTL 缓存则按“定义 / 失效 / 预热 / 运行时”继续分层。

## Frontend architecture

### App shell

- `src/web/main.ts`: 应用创建、Pinia、Router、I18n、旧 token Cookie 迁移
- `src/web/App.vue`: 全局生命周期、切回前台自动同步、公共配置初始化

### Views

- `src/web/views/Index/index.vue`: 公共首页壳层
- `src/web/views/AdminDashboard.vue`: 后台管理壳层

后台不是多路由系统，而是在单个页面内通过视图切换和懒加载组件组织功能区。

### State

- `store/data.ts`: 导航数据和 CRUD
- `store/admin.ts`: 登录态、用户和后台设置
- `store/config.ts`: 公共设置和页面外观

## Browser extension

`clients/extension/` 当前仍保存在这个仓库里，但运行模型已经按独立客户端收口：

- 主站不再负责扩展下载打包、自动注入配置或一次性会话引导
- 扩展安装后由用户自行填写 `serverUrl + username + password`
- 扩展只依赖通用 `/api/login`、`/api/sessions`、书签/分类/搜索等常规接口
- 主站和扩展共享后端 API，但不再共享引导/交付链路

因此后续如果要把扩展拆到单独仓库，主要是仓库与 CI 迁移，而不是再做一轮运行时解耦。

## Current refactor guardrails

后续整理或重构时建议遵守：

- 保持单进程全栈部署模型，不要无计划拆成多个运行时
- 保持“控制器薄、服务层厚”
- 新前端公共能力优先进入 store 或 composable，不要继续散落在组件内单独请求
- 书签/分类后端逻辑直接依赖 `bookmarkReadService` / `bookmarkWriteService` / `categoryReadService` / `categoryWriteService`；兼容 facade `BookmarkManager` / `CategoryManager` 已删除
- 文档若与代码冲突，以 `server.ts`、`src/server/routes/` 和真实控制器实现为准
