# 审查台账（Review Ledger）

> 目的：记录多轮全库审查的发现、修复与遗留项，供下一轮无缝衔接。
> 流程与维度定义见 [REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md)。
> 基线版本 **1.0.8**（`package.json` 为准）。17 轮全库审查 → v1.0.7 release（`150e19a`）；18-23 轮修复随 **v1.0.8 release**（`bb6a3d0` squash）发布，CI 修复 `4bfc13d` 后全绿。24-34 轮修复随 **v1.0.9 release**（`7563f5b` squash）发布。**origin/main = `7563f5b`**。

## 当前状态

| 提交      | 内容                                                                                                                                                                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `7f365c1` | 第 1 轮审查修复（全库安全/正确性 + 构建层）                                                                                                                                                                                                                       |
| `498c4fa` | 新增 `docs/REVIEW_CHECKLIST.md`                                                                                                                                                                                                                                   |
| `20df7da` | 第 2 轮修复（安全/i18n/健壮性，18 项）                                                                                                                                                                                                                            |
| `f757918` | 第 3 轮修复（整洁度/科学度，22 项）                                                                                                                                                                                                                               |
| `3db9784` | 第 4 轮修复（幸存者扫描，20 项）                                                                                                                                                                                                                                  |
| `fcf54e5` | 测试性能：纯 Node 测试改走 node 环境（墙钟 -40%）                                                                                                                                                                                                                 |
| `a712108` | 第 5 轮修复（架构级/运维硬化，17 项）                                                                                                                                                                                                                             |
| `9ac2467` | 第 6 轮修复（变更回归/测试质量，15 项）                                                                                                                                                                                                                           |
| `5778a77` | 删除 PV/UV 采集（统计面板已下线）                                                                                                                                                                                                                                 |
| `f2a4c6a` | 组件拆分专项（3 大组件 → 9 子组件）                                                                                                                                                                                                                               |
| `fa0f4fc` | 第 7 轮修复（死 key/类型/文档清理，12 项）                                                                                                                                                                                                                        |
| `3385eb1` | 第 8 轮修复（UX/可访问性/扩展/构建，30 项）                                                                                                                                                                                                                       |
| `864e9eb` | TRUST_PROXY 默认开启（信任一层反代）                                                                                                                                                                                                                              |
| `c33d505` | 第 9 轮修复（TRUST_PROXY 告警/a11y 测试，15 项）                                                                                                                                                                                                                  |
| `5b99dbb` | 第 10 轮修复（数据层/性能/API 契约，18 项）                                                                                                                                                                                                                       |
| `dff7b94` | 第 11 轮修复（前端运行时/安全纵深/测试，17 项）                                                                                                                                                                                                                   |
| `cfdff50` | 第 12 轮修复（扩展生命周期/图标/主题，20 项）                                                                                                                                                                                                                     |
| `582efed` | 第 13 轮修复（i18n parity/配置文档/集成，15 项）                                                                                                                                                                                                                  |
| `017d11a` | 第 14 轮修复（可访问性/移动端/性能，25 项）                                                                                                                                                                                                                       |
| `892a06e` | 第 15 轮修复（错误纵深/迁移完整性，14 项）                                                                                                                                                                                                                        |
| `3fd3c21` | 第 16 轮修复（供应链/API docs 暴露，19 项）                                                                                                                                                                                                                       |
| `f2cb153` | 第 17 轮收口修复（发布就绪，7 项）                                                                                                                                                                                                                                |
| `150e19a` | **v1.0.7 release**（squash 40 提交为单 release 提交，371 文件）                                                                                                                                                                                                   |
| `1c3dd34` | release 后运维：HEALTHCHECK CMD 改 JSON 数组（CI hadolint DL3025 修复）                                                                                                                                                                                           |
| `371fcea` | release 后运维：`REAL_CLIENT_IP_HEADER`（CDN 专用客户端 IP 头支持）                                                                                                                                                                                               |
| `71eea62` | release 后运维：Cloudflare 真实 IP 自动检测（socket 对端 ∈ CF 官方网段才采信 `CF-Connecting-IP`，零配置）                                                                                                                                                         |
| `bb6a3d0` | **v1.0.8 release**（squash 第 18-23 轮修复 + 版本四方对齐 bump）                                                                                                                                                                                                  |
| `4bfc13d` | release CI 修复：SSRF gate IPv6 字面量剥 `[]` 走内存直连（不依赖 dns.lookup，修 Windows 绿/Linux 红平台差异）                                                                                                                                                     |
| `83f6eda` | compose 透传 `REAL_CLIENT_IP_HEADER`（本地，未推送）                                                                                                                                                                                                              |
| `0f350bc` | 第 24 轮修复（8 项 = SSRF fe 段 + audit/session 排序收口 + 扩展时间解析 + 测试时区无关 + 机密文件权限 + CI diff-check + runtime-min CRLF + compose 注释，未推送）                                                                                                 |
| `eb8268d` | 第 25 轮全量盲审修复（12 项 = footerHtml RangeError + 导入 private 映射 + 拖拽未分类 + health 分级 + 登录限流只计失败 + 等清理，未推送）                                                                                                                          |
| `48c7de2` | 第 26 轮修复（6 处 = health 分级收口根治 + 面板鉴权端点 + JWT chmod 读取分支 + ADMIN_USERNAME trim + private 语义注释 + ci.yml force-push 兜底，未推送）                                                                                                          |
| `3ce6b56` | 第 27 轮盲审修复（6 处 = updateUser 全量校验 + requireAdmin fail-closed + 删除失败提示 + SSRF 两段 + 匿名去 version + GHA env 传递 + ui 转义，未推送）                                                                                                            |
| `d26f0a2` | 第 28 轮盲审修复（8 处 = 会话复用续期 + locale 缺 key + SessionManager/DataManager 静默吞错 + 双重 toast + ui data-id 转义 + 审计分页钳制 + FileReader onerror，未推送）                                                                                          |
| `57d3d72` | 第 29 轮盲审修复（5 处 = compose TRUST_PROXY=false + table.deleteSuccess 补 key + 双重 toast ×2 空吞 + stale 注释/文档去 version，未推送）                                                                                                                        |
| `d615b0f` | 第 30 轮盲审修复（7 处 = cache ECACHEFULL 降级 + 自降级守卫 + runUserAction 刷新分离 + JSDoc 去 version + 批量 ids max + update/delete 编码 + 游客回前台刷新，未推送）                                                                                            |
| `40a8647` | 第 31 轮盲审修复（3 L = release.yml 触发步 env 化 + SSRF 补 TEST-NET/6to4 relay 三段 + 迁移用户名 charset 校验，未推送）                                                                                                                                          |
| `f67129d` | 第 32 轮双报告修复（6 处 = IPv6 零地址拼写封锁 + 认证态数据刷新 + 扩展搜索 requestId + AdminDashboard 会话过期跳转 + docker semver + 会话仅延长续期）。**当前状态：本地 10 提交未推送（83f6eda→f67129d），origin/main = 4bfc13d**                                 |
| `6e0b445` | 第 33 轮台账清账/清理/专项收口（`ea4c85c` B1、`58265a3` C1+C2、`6999cfb` B2+C4、`6e0b445` A，详见第 33 轮章节）                                                                                                                                                   |
| 第 34 轮  | 盲审修复共 8 提交 = 7 修复提交（`33e2901` G2、`683fb1d` G3、`18f8836` G1M1+G5、`7e3e50c` G1L1、`0e5f267` G4、`8ed3f34` G6、`15c3af1` G7L10）+ 本台账提交（G1 文案/清空 + G2 后端口径 + G3 错误态 + G4 a11y/死 API + G5 守卫 + G6 docker + G7 交付维护，见下章）。 |
| `7563f5b` | **v1.0.9 release**（第 24-34 轮修复 squash + 版本四方对齐）。**origin/main = `7563f5b`**                                                                                                                                                                          |
| `6b7e3d1` | 第 35 轮前维护：OPERATIONS 手册 demo 挂载路径匿名化（本地，未推送）                                                                                                                                                                                               |
| `e7188b0` | 第 35 轮前维护：移除 Docker Hub 发布 + 随机化 manual-demo 凭据（本地，未推送）                                                                                                                                                                                    |
| `fb98f8f` | 第 35 轮 G1 存储守卫（authStorage write/clear + 搜索设置读写降级，未推送）                                                                                                                                                                                        |
| `0365c3c` | 第 35 轮 G2 错误态（UserTable/SystemSettings loadError + retry，未推送）                                                                                                                                                                                          |
| `16c343c` | 第 35 轮 G3 后端校验（bulk id positive/数组 max/DFS visited + /api no-store，未推送）                                                                                                                                                                             |
| `98465e8` | 第 35 轮 G4 a11y+死码（分类标题 button、扩展 dialog/可访问名、AppSelect 焦点、预览图 alt，未推送）                                                                                                                                                                |
| `5b22e02` | 第 35 轮 G5 运维（容器内备份/恢复、TRUST_PROXY 文档、GHA id-token 清理，未推送）                                                                                                                                                                                  |
| 第 35 轮  | 本台账提交。**当前状态：本地 8 提交未推送（`6b7e3d1`/`e7188b0` + 本轮 5 修复 + 本台账），origin/main = `7563f5b`**                                                                                                                                                |

验证门槛：`npm run typecheck`、`npm run lint:check`、`npm run test:fast`、`npm run versions:check`、`npm run extension:sync-common:check`、`npm run openapi:types:check`、`npm run build`。`test:fast` 现为 **199 文件 / 1142 测试**（会排除 `tests/integration/**` 与 `tests/smoke/runtime.smoke.test.js`，另手动跑 = integration + smoke 19）。

## 第 1 轮（`7f365c1`，前序会话完成）

安全/正确性 + 构建层。关键修复：优雅停机（SIGTERM→close→checkpoint→closeDb）、登录 IP 限流（防用户名轮换）、删除主管理员/当前操作者自保护、`VACUUM INTO` 备份 + 7 份保留、链接检测固定解析 IP（防 DNS 重绑定 SSRF）、`/api/health` 剥离 dbPath、环境变量告警（TLS 反代源、JWT 密钥）；前端批量操作 await+单一 toast、分页按条数重置、引擎选择器 emit 时机、延迟 revokeObjectURL、定时器/rAF 清理、删除死代码（useLazyLoad）、共享 file/event 工具、导入大小守卫、`rel=noopener`/`data:image`/href 安全；PNG PWA 图标、移除跨源 favicon SW 缓存；API.md 补路由、README 端口修正。

## 第 2 轮（`20df7da`，18 项 = 5M + 13L）

- **M** 恶意 Cookie `%zz` → `decodeURIComponent` 抛 URIError → 500（`authCookie.readAuthCookie` try/catch）
- **M** `/api/suggest` 公开无限流 + keyword 无上限 → `suggestLimiter` + 200 字符截断
- **M** `handleCheckLinks` 重复 URL 只回写最后一个 → `url→id[]` 映射
- **M** `en-US` 缺 `category.addCategory` → 补
- **M** 首页组件硬编码中文 → 6 组件 + 4 TS helper 全走 `t()`（引擎弹窗/搜索框/选择器/侧栏/空态/toast/占位符）；Clock 为 locale-aware，未处理
- **L** 批量链接检测单条非法 URL 整批 400 → 逐条 `{url,status:'error'}`
- **L** 登录时序用户枚举 → 用户缺失时对比固定 dummy bcrypt hash
- **L** 公开 health 返回原始 error.message → 固定脱敏文案
- **L** `daily_stats` read-then-upsert 丢 PV → `INSERT ... ON CONFLICT`
- **L** touch 长按 500ms 滚动不取消 → touchmove 超 10px 阈值取消
- **L** JSON 导入无大小守卫 → 10MB 上限
- **L** API.md 过期 `GET /stats`、`GET /cache` → 移除
- **L** footerHtml sanitizer 未闭合标签 → 补齐 `openTagStack`
- **L** `useCachedApi` 死代码 → 删除（源+测试）
- **L** `useDebounce` 的 `debounce/throttle` 无用导出 → 删除
- **L** ~31 个无引用 locale key → 程序化核验后删除
- **L** `langIcon` 两份重复 → 提取 `utils/langIcon.ts`
- **L（deferred）** 超大组件 SystemSettings(750)/DataManager(647)/BookmarkImport(605) → 已记待拆

## 第 3 轮（`f757918`，22 项 = 2H + 7M + 13L，视角：整洁度/科学度）

- **H** `server/utils/ApiError.ts` 全文件死代码 + 与 `errorHandler.ts` 冲突克隆（参数顺序/错误码/JSON 结构）→ 删除
- **H** 三套用户名规则（Joi `alphanum 3-30` vs sanitize `[a-zA-Z0-9_]{3,20}` vs validators `[a-zA-Z0-9_-]{3,20}`）→ 保留 Joi，删两个无用 helper
- **M** 扩展 `utils/url.js` 漂移（缺非 HTTP scheme 拒绝）→ `url` 加入 SYNC_MODULES，popup 改引 `common/url.js`
- **M** 双响应信封 `data?`/`content?` → unwrap 只认 `data`（`content` 仅 POST /data 历史输入）
- **M** SearchEngine 注释谎称"全文检索"（实为 LIKE）+ `%`/`_` 未转义 → 改函数 + 转义 + `ESCAPE`
- **M** `trackClick` 吞 DB 异常转 404 → 记录后 rethrow（与兄弟方法一致）
- **M** `_username` 形参全链无用 → mutation(11)/query/lookup/controller/command 全部移除（含测试 50+ 调用点）
- **M** `isValidUrl` 前缀误判（`https://` 空主机通过）→ `new URL()` + 协议白名单
- **M** 三套 URL 归一化器 → `useImportExport` 改用共享 `normalizeUrl`
- **L** `normalizeLevel` 两处实现 + 魔法 999 → `levelUtils.ts`（`normalizeLevel`+`ALL_LEVELS`）
- **L** cache.ts "Phase 3" 过期注释 → 指向 `invalidateBookmarkCaches`
- **L** 快照 `Record<string,unknown>` + camel/snake 双补丁 → `BookmarkSnapshotItem/Category` 类型，单 camelCase 字段
- **L** `cacheService` facade 四种导入姿势 → 统一命名导出
- **L** SearchEngine 无状态 class → 模块函数 `searchBookmarks`，limit/level 非法抛 400
- **L** `saveData` 布尔握手 → 失败直接 throw（含约束冲突→400）
- **L** `safeAssetUrlSchema`/`safeHomeUrlSchema` 逐字节重复 → 别名
- **L** Joi `abortEarly:false` 全收集全丢弃 → 首个失败字段附到 400 消息
- **L** `level <= 3` 魔法 → `USER_LEVEL.GUEST..ADMIN`
- **L** 扩展 `api.js` 空 catch-rethrow + 无超时 → 删 catch + `AbortSignal.timeout(15s)`
- **L** 跟踪参数黑名单混入功能参数（from/ref/source/ts）→ 分层注释说明取舍
- **L** `ApiError.status` 0 哨兵 → `status?: number`
- **L** 后端硬编码 `'未分类'` → 返回 `null`，前端 locale 渲染

## 第 4 轮（`3db9784`，20 项 = 2H + 8M + 10L，视角：幸存者扫描）

- **H** 时间戳双格式：`datetime('now')`（空格、无时区）vs `toISOString()` → 服务端统一 `strftime('%Y-%m-%dT%H:%M:%fZ','now')`（7 处）+ 前端 `parseDateString` 对空格格式补 `Z` 按 UTC 解析
- **H** `/sites/:id/click` 公开无等级过滤且返回完整行 → `optionalAuth` + `level<=?` + 分类可见性 + 最小负载 `{id,clickCount,lastVisited}`
- **M** `cacheWarmupService` 写 `settings:all`/`categories:all` 零读取 → 删除整个服务 + 未用 `CacheKeys`/`CacheTTL`
- **M** `saveData` 强制备份仍受 500ms 节流 → 备份未执行即中止（抛 500）
- **M** 去重不对称（`findDuplicateItemByUrl` 未归一化）→ 两侧过 `normalizeUrl`
- **M** 导入分类兜底 `?? 1` 指向不存在分类 → `?? 0`（未分类）
- **M** PV 双计（statsLogger + SPA `/api/visit` 首载）→ SPA 跳过首次导航
- **M** 过期会话无限累积 → 每日 3:00 cron `sessionService.cleanup()`
- **M** 批量导入约束冲突泛化 500 → `SQLITE_CONSTRAINT_*` → 400 + 提示
- **M** search 缓存键无上限 + level 无钳制 → `maxKeys:1000` + `normalizeLevel` 钳 `[GUEST,ADMIN]`
- **L** command 层 `username` 残留 10 方法 + batch 死 `===null` 判断 → 删除
- **L** `update()` 空 payload 误报 404 → 返回当前行
- **L** `导入成功，已同步...` 硬编码 + 4 个死 `menu.extension*` key → i18n + 删除
- **L** `pruneBackups` 误纳 `pre-restore` 快照 → 排除
- **L** `checkUrlItem` ad-hoc cache 形状 → 类型化 `BookmarkSnapshotCache`
- **L** `syncRenamedSessions`/`sessionService.renameUsername` 死代码 → 删除
- **L** `idx_items_url` 与 `url UNIQUE` 索引重复 → 删除
- **L** 游客点击计数陈旧 → store `patchItemClick` + Site.vue 应用响应
- **L** statsLogger 统计 bot 探测（SPA fallback 200）→ 要求 `Accept:text/html` 且无文件扩展名

## 测试性能（`fcf54e5`）

全局 `environment: 'jsdom'` 曾让 88 个纯 Node 测试文件（server 82 + shared 5 + integration 1）付 jsdom 环境税（累加 1338.98s）。已给它们加 `// @vitest-environment node`。实测 `test:fast`：墙钟 135.8s→81.4s（-40%），environment 累加 -53%。
**注意**：`test:fast` 排除 `tests/integration/**` 与 `tests/smoke/runtime.smoke.test.js`——改到这些目录时必须手动跑 `npx vitest run tests/integration tests/smoke`。
顺带修了第三轮遗留的 integration 断言（`categoryName: null`）。

## 第 5 轮（`a712108`，17 项 = 5M + 12L，视角：架构级/运维硬化）

- **M** 会话条件时间格式混用（round-4 回归）→ 比较侧统一 T 格式 + 到期日当天测试（`sessionService.ts`）
- **M** services→middleware 反向依赖 → `errors`/`ApiError` 迁 `src/server/utils/errors.ts`、Joi schema 迁 `src/server/validation.ts`，15 处 import 直改无转发，`middleware/validation.ts` 删除
- **M** Joi 校验下沉命令服务 → 共享 `validatePayload` 上移 controller 边界，删手写 `JoiLikeSchema`
- **M** `node-cron` import 失败阻断启动 → try/catch 降级 warn（`initService.ts`）
- **M** web `adminStore.token` JWT 死契约 → 删除（会话纯 HttpOnly Cookie 承载）
- **L** 文档漂移：ARCHITECTURE cacheWarmup 残留、`/sites/:id/click` swagger 注释、SystemHealth 死 UI/必填类型、audit 注释
- **L** 死代码：`asyncHandler`、`clearUserCache`、`CacheKeys.userInfo`
- **L** 运维：启动顶层 try/catch + unhandledRejection/uncaughtException、dist 缺失启动检查、CORS 拒绝不再 500（`{origin:false}`）、toolSuggestion `response.ok`+warn、systemAssetService 检查 `set` 返回值
- **L** `models/stats.ts` 内层 catch 只吞 UNIQUE 冲突（其余日志）
- **L** `bookmarkWriteService` 手动 `MAX(id)+1` → `lastInsertRowid`（无 AUTOINCREMENT）
- **L** 前端 6+1 处魔法数字 `3` → `USER_LEVEL.ADMIN`
- **L** PV 采集双实现（statsLogger vs statsService）→ 收敛 `statsService.recordVisit` 单入口
- 遗留项专项评估（未实施）：三组件拆分可行（业务逻辑已抽入 composables，余机械模板拆分）；PV/UV 采集无读取端（访问统计面板已随 `GET /stats`/`GET /cache` 移除而下线，见 `docs/API.md`）

## 第 6 轮（`9ac2467`，15 项 = 4M + 11L，视角：变更回归/测试质量）

- **M** 登录响应体仍返回明文 JWT（与第 5 轮"HttpOnly Cookie only"矛盾）→ 按来源分流：浏览器 Web 请求剥离 token，扩展/CLI 保留（`isExtensionOrigin` 导出）
- **M** `models/stats.ts` 约束分类过宽（`startsWith('SQLITE_CONSTRAINT')` 吞所有约束）→ 收窄 `=== 'SQLITE_CONSTRAINT_UNIQUE'`，其余记日志 + 标失败，补 `stats.errors.test.js`
- **M** `bookmarkController` 400 负路径零测试 → 补 4 用例（非法 payload → 400/BAD_REQUEST/字段名）
- **M** `initService` node-cron 降级路径零测试 → 补测试 + 降级日志明确"定时清理不执行"
- **L** `categoryWriteService` MAX(id)+1 残留 → `lastInsertRowid`（补齐 bookmark 同款不变式）
- **L** `formatError` 仍寄居 middleware → 迁 `utils/response.ts`，errorHandler/controllerResponder 反向 import
- **L** `systemAssetService` 假成功 → set 失败回滚删文件 + 抛 500
- **L** `/api/visit` 写失败静默 200 → 改 500，swagger 同步
- **L** `statsLogger` 死 try/catch（recordVisit 内部已兜底）→ 删除
- **L** `unhandledRejection`/`uncaughtException` 直接 exit → 复用 `shutdown()` 优雅停机
- **L** `sessionService` 旧空格格式行被提前吊销 → 比较侧 `replace(expires_at,' ','T')` 归一 + 测试
- **L** 死代码清理：locale `health.runtimeDataDir/uploadsDir`、web `LoginResponse` 死类型、`JWT_EXPIRES_IN='7d'` 常量
- **L** 测试质量：sessionService 隐藏 revoke 副作用断言拆开、`validation.test.js` 移目录、statsService 测试用真实 ua-parser-js
- 排除项（DeepSeek 核实无问题）：bot 过滤不对称、`minLevel`、`pinned` 默认值
- 遗留：`MaxIdRow` 类型导出（categoryWriteService 移除使用后成死类型，删需动 domain.ts 类型组，超范围未动）——**已过时/固定**：第 33 轮核实该类型已不存在于代码（全库 grep 仅台账自身引用，早前轮次随 domain 类型组整理一并消失），无需再处理

## 第 7 轮（`fa0f4fc`，12 项 = 全 L，视角：三大变更回归 + 清理）

三个变更（`9ac2467` 第 6 轮 / `5778a77` 删 PV/UV / `f2a4c6a` 组件拆分）**确认无功能回归**（3 agent 独立核实：样式零丢失、props/emits 完整、删后零残留、JWT 分流有测试）。修复项：

- 死 locale key 5 个（`menu.stats/sessions/audit/extension/health`，删 PV/UV 漏网 + 历史残留），同步删 `i18n.test.ts` 对 `menu.health` 的断言
- `LoginResponse.token` → 可选，登录文档（ARCHITECTURE/API）按来源分流重写（web 剥 token / 扩展与 CLI 保留）
- 拆分组件 2 处硬编码中文 aria-label → i18n（`manage.tabsLabel`/`clearSearch`）
- `dragActive` 死状态（composable 4 处）、AdminSidebar 77 行死 CSS 删除
- DataManager.test stub delete payload 对齐真实形状（对象非数字）
- BookmarkImport 勾选改子组件 emit `toggle-category(name,checked)`，消除按引用改 prop
- `/login` swagger 补 token 条件说明 + openapi 重新生成
- **Statistics tag 保留**：核实 `/sites/{id}/click`（bookmarks.ts:293）仍用，非悬空（Pi 判定有误）
- 取舍：sessionService `replace()` 保留（表小 + 旧备份库仍可能空格格式）+ 注释；拆分样式三份复制仅注释不重构（scoped 全局化有视觉风险）；response.ts 中文脱敏文案 wontfix + 注释

## 第 8 轮（`3385eb1`，30 项 = 1H + 11M + 18L，视角：UX/可访问性 + 扩展 + 构建交付）

**H** SiteCard 锚点无 href → 键盘无法打开书签 → 恒带安全 href + 模式分派点击

- **M** 模态无焦点陷阱 + 关闭不归还 → 新 `useDialogA11y`（focus trap/Esc/归还）接入 7 类弹窗，删 `useFocusOnOpen`
- **M** Esc 穿透双关 → feedback 弹层捕获期消费 + stopPropagation
- **M** toast 无 aria-live → `role="status"`/`alert`
- **M** SiteContextMenu 纯鼠标 + 无视口钳制 → button+menuitem + 键盘导航 + 钳制
- **M** feedback 中文按钮 → `feedback/locale.ts` 走 i18n
- **M** 扩展登录无协议校验 → `isAllowedLoginOrigin`（https/本地回环）
- **M** 扩展 token 长期落盘 → 保持 local + 注释（session 需 Chrome102+/FF115+，扩展支持 FF≥74）
- **M** 扩展 `tabs`/`optional_host_permissions` 过宽 → 删死代码 `permissions.js`、`tabs`→`activeTab`、移除通配 host、README 修正
- **M** Firefox strict_min_version 57→74（可选链）
- **M** AdminSidebar/SidebarItem/SearchBox、SearchEngineSelector hover-only → 可达 button/焦点
- **L** 18 项：4 弹窗 aria-label、SiteDialog 打开聚焦、pendingCapture TTL、error code 判定、SystemHealth/SiteTable 错误态+重试、AppSelect aria-activedescendant、tab 语义、保存双击防抖、扩展 label for/icons/登出入口、Docker COPY 收窄+HEALTHCHECK、vite brotli 双实例删（.br 恒 0）、manualChunks 死判断+preconnect、terser 保 warn、lint --fix 拆分、reduced-motion、savedUsername 改 local
- 已核实排除：token 存 local 非 sync、remember 语义、Docker 非 root/多阶段、CSP、SW 缓存、CI 门禁、audit 0

## 第 9 轮（`c33d505`，15 项 = 1H + 2M + 12L，视角：TRUST_PROXY 回归 + 焦点管理测试）

**H** TRUST_PROXY 默认 true × 默认 compose 直连暴露：默认信任 XFF，攻击者可伪造头绕过按 IP 限流（登录/suggest/点击）+ 审计 IP 可伪造。用户选**方案 B**：`validateEnv` 在 production + TRUST_PROXY 未显式设置时告警"建议显式 TRUST_PROXY=false"（config/index.ts:259），直连公网不再静默。

- **M** useDialogA11y（第 8 轮新 composable）零单测 → 新建 7 用例（聚焦/Tab 回绕/Esc+stopPropagation/归还/卸载清理）
- **M** SiteContextMenu 键盘/钳制无测试 → 补 3 用例（Esc/方向键/钳制），先修 focusIndex off-by-one（-1 时按方向取首/末项）
- **L 12 项**：CORS 告警文案矛盾修正；authCookie 保留 env 读取+注释（复用 config 常量会破坏请求时点改 env 的测试语义 + 引入 JWT 生成副作用，有意取舍）；readForwardedProto 死代码注释；Esc 双路径 → composable stopPropagation；视口钳制 clampTick 按真实尺寸重算；Dockerfile.runtime-min 同步（COPY 收窄+HEALTHCHECK）；TRUST_PROXY 默认值断言（未设→true/'false'→false）；limiter 注释补前提；OPERATIONS.md 多跳代理；扩展 README LAN http 声明；SiteCard 中键选择模式拦截
- 排除项：扩展 activeTab 功能完好、CSRF/来源校验无回归、vite 产物、Docker HEALTHCHECK、ipKeyGenerator 安全

## 第 10 轮（`5b99dbb`，18 项 = 6M + 12L，视角：数据层/持久化 + 性能/资源 + API 契约）

**M** 分类 parentId 无环校验（update/导入可构造 A→B→A 环致分类子树从首页静默消失）→ `assertValidCategoryParent`（祖先链）+ `assertNoCategoryCycle`（导入 DFS）+ ApiError 透传，6 单测

- **M** 4 条 Admin 路由无 @swagger 注解 → 补齐 + generate 脚本加"路由声明 ↔ spec path 全量比对"防再犯
- **M** queryMonitor 零调用（health 慢查询恒空）→ 接线到 db 层（prepare/exec 包装）
- **M** /assets 指纹资源无长缓存 → immutable 31536000；/uploads 短缓存
- **M** Bookmark schema categoryName 契约漂移 → nullable + 补实际返回字段
- **M** Item.categoryId 三处契约冲突 → 统一 number + "0=未分类"注释（改 nullable 破坏前端类型）；Item/Category 补 sortOrder
- **L 12 项**：死索引清理（核实后删 4 个）、429 统一信封（success/code/RATE_LIMITED）、forceCheckpoint 取舍注释、注释漂移修正、audit_logs 保留策略（90 天+10000 条挂 cron）、web fetch 15s 超时、API.md 补路由、建表默认值统一 strftime、backup/restore 信封 code、getAll 清列、SearchEngine limit 钳制、重复日志删
- 排除项：备份/恢复链路、事务、前端资源清理、限流阈值、缓存失效、懒加载、restore 快照、状态码语义

## 第 11 轮（`dff7b94`，17 项 = 6M + 11L，视角：前端运行时/状态管理 + 安全纵深 + 测试科学度）

**M** useImportExport JSON 导入 parentId 不重映射（子分类错挂/悬空）→ 两遍映射回填 parentId，无映射归根；浏览器导入兜底 `?? 1` → `?? 0`

- **M** visibilitychange 全量刷新 × 乐观更新竞态 → loadData 双守卫（saving 跳过 + 在途不应用旧快照）
- **M** 分类树读侧环递归崩溃（历史环数据）→ buildCategoryTree 挂载前 `formsCycle` 断环，成环节点转根
- **M** store 中文 toast 8+ 处 → `i18n.global.t` + 8 个双语 key
- **M** 导入测试树形盲区 → 树形 fixtures（父冲突重映射/悬空归根/空分类集）
- **L 11 项**：click 路由 origin 校验（单独中间件挂 click）、config force 并发去重、persistConfig try/catch、favicon content-type 白名单 + in-flight 去重、moveCategory fromIndex 校验、CSP connect-src 收紧 'self'、saving 改计数（非死导出）、authStorage 收敛 admin_user 三处、bookmark-managers 测试改名、sync/patchItemClick 补测试、favicon 测试补强
- 排除项：CSRF 主链路、SSRF 三面、footerHtml/v-html、composable 清理、audit:prod 0

## 第 12 轮（`cfdff50`，20 项 = 3M + 17L，视角：扩展客户端全量 + 前端样式/视觉 + 构建产物）

**M** pendingCapture 展示即弃（数据丢失）→ 保存成功后才消费（currentPendingCapture + onPendingCaptureConsumed），badge 随成功清除，3 测试

- **M** 三个 iconfont 类未定义（空白图标）→ 核实 glyph 从未入库，替换为已定义等价类（icon-md-link/icon-fenlei/icon-md-pin），脚本验证零未定义
- **M** zh 缺 logout key（"undefined"）→ 补 key + ui.js 守卫回退
- **L 17 项**：globIgnores 死条目收敛（sw.js 预缓存 16 条全首页资源）、右键链接标题错配、Firefox openPopup 回退、clearSearch debounce、toast aria-live、api.js 死导出删、连接卡片预填收敛、Web 首访主题 prefers-color-scheme 回退、.el-drawer 死 CSS 删、死 woff/ttf 删
- **核实后保留（审查前提不成立）**：--el-* 变量有真实消费者、--ui-font-display 被 7 组件引用、扩展默认分类保留、iconfont 未用类保留（AppIcon 动态类名）、右键菜单英文、断点收敛——均注释说明
- 排除项：manifest 兼容、tabs.query activeTab、common 同步、innerHTML、pendingCapture TTL、UserDialog.scss

## 第 13 轮（`582efed`，15 项 = 6M + 9L，视角：i18n 完整性复检 + 配置/文档一致性 + 集成测试）

**M** en 缺 auth.registerFailed（fallback 中文）→ 补 key；扩展 en 缺 loggedOut → 补 key + parity 测试

- **M** useUserTableDialogs 硬编码中文 → t()；**集成测试壳漂移** → click 链路与生产对齐 + 注释局限（选 B：supertest 重写风险高、smoke 已覆盖全链路）+ 游客点击用例；**importConfirm 陈旧文案** → 并入 importSuccess 单 key；**默认站点名 vs en tip 矛盾** → 改 en 文案（保留品牌默认）
- **L 9 项**：5 死 key 删（grep 核实）、译文拼接 ×4 参数化（sessionsRevoked/saveSuccess/duplicateWithName）、bookmarkImport 兜底走 t()、errors fallback 改中性英文、.env.example 补 TRUST_PROXY/log/bootstrap TTL、en↔zh parity 测试（web+扩展新 i18n.test.js）、docs/README 版本、smoke 补 register 用例、CORS '*' 不对称文档
- 排除项：版本三方一致、swagger↔API.md 一致、扩展 data-i18n 对齐、动态拼接 key 有消费者

## 第 14 轮（工作区未提交，25 项 = 3P1 + 10P2 + 12P3，视角：可访问性/WCAG + 移动端响应式 + 前端性能/离线）

**P1**

1. **移动端分类导航不可达**（CollapsibleSidebar ≤768px display:none + 汉堡/FAB no-op）→ 评估：首页纵向分类区块 + 各分类 sub-category-tabs 已承担移动端导航，无独立抽屉需求 → 移动端隐藏 PageHeader 汉堡与 Sidebar 菜单 FAB 两个 no-op 控件
2. **首帧空白 + 骨架屏不可见**（`.content opacity:0` + 双 API + 双 rAF + 200ms）→ `.content` 默认可见（骨架屏立即可见）、checkReady 去掉双 rAF+200ms 人工延迟、Background 默认艺术加 opacity 过渡淡入
3. **搜索建议无键盘导航**（SearchResults 纯 div 点击 + handleEnter 忽略高亮）→ SearchBox 转发 `keydown`、useSearchExecution 新增 `handleSearchKeydown`（↑/↓ 循环移动高亮、Enter 选中高亮项且交由 keyup.enter 打开引擎避免双开）、列表 `role=listbox/option` + `aria-selected`、本地/在线结果区 `aria-live="polite"`；补测试

**P2** 4. SiteCard 选择模式 anchor 加 `role="checkbox"` + `:aria-checked`；5. 表单校验失败绑 `aria-invalid`（LoginDialog 双字段 / CategoryDialog 分类名 / BookmarkForm name+url / CategoryForm 分类名，经 useSiteDialogForm.invalidFields 管道；aria-describedby 因错误为瞬态 toast 无驻留文本元素，注释取舍）；6. SiteCategory tablist ←/→ 方向键切换 activeTabId 并 focus（用 event.target 定位，静态项与 v-for 项混用 ref 收集不可靠改 DOM 查询）；7. 每分类 `<main>` 改 `<div>`（单页单 main landmark）；8. SiteCard/SearchEngineSelector/AdminSidebar/CategoryForm `<img>` 补 alt（装饰图 alt=""）；9. PageHeader 汉堡/语言/主题补 aria-label，汉堡补 aria-expanded（经 Index provide isSidebarCollapsed）；AdminHeader 移动汉堡补 aria-label/expanded/controls（新增 sidebarOpen prop）；10. SiteTable 全选/行 checkbox 补 accessible name + 状态 aria-label 本地化（table.linkOk/linkError）；11. 弹窗统一 `max-height:min(86vh,860px)+overflow-y:auto`（LoginDialog/CategoryDialog/UserDialog.scss/BookmarkImport/engine-dialog，SiteDialog 已有）；12. Sidebar `.sidebar-item` 补 `:focus-visible`；13. SearchBox 核心 input 补 aria-label + local 模式按钮 aria-pressed

**P3** 14. pin-badge emoji `aria-hidden` + sr-only"已置顶"；15. Site.vue `store.loadError` 非空渲染错误态+重试（对齐 SiteTable sn-error-state，不再显示"暂无数据"）；16. LoginDialog tabs 补 `role=tablist/tab` + aria-selected；17. `--card-muted` 0.58→0.72 alpha（白底对比度 ≈4.2:1 → ≈6.7:1）；18. i18n 初始化同步 `document.documentElement.lang`（补测试）；19. `.home` 整页 `user-select:none` 收窄到 `.site-card`；20. AdminSidebar logo/avatar img alt + 移动关闭按钮 aria-label/controls；21. SearchEngineSelector `alt="icon"`→`alt=""`；22. AdminSidebar 激活菜单 `aria-current="page"`；23. `default-bg.jpg`（2.4MB）grep 零引用后 `git rm`；24. App.vue 全局 `::-webkit-scrollbar{width:0}` 影响长内容区 → 恢复 `.sn-table-scroll` 可见滚动条；25. 各弹窗 `.dialog-kicker` 11px→12px

- 排除项：navigateFallback（核实产物已有 NavigationRoute，未动）；表单 label 包裹关联/焦点环替代/触控目标/响应式断点/SW 策略/prefers-reduced-motion；isAllowedLoginOrigin、TRUST_PROXY 语义等历史决策

## 第 15 轮（`892a06e`，14 项 = 4M + 10L，视角：错误处理纵深 + 数据完整性/迁移 + 综合幸存者）

**M** migrateUsers per-file 隔离 + per-user 事务（坏 JSON 不再中断/丢用户，失败清单保留供重试）；SPA 全局错误兜底（errorHandler + unhandledrejection + 30s 节流 toast，新 unexpectedErrorFeedback）；restoreDatabase 覆盖前校验（新 databaseBackupValidator：只读 + integrity_check + sqlite_master 非空拒空库）；migrateUsers datetime('now') → strftime 统一

- **L 10 项**：migrateFromJson 重复 URL 检测+告警、归档语义修正（不误报失败）、auditService 与 cron 共用 AUDIT_LOG_MAX_ROWS=10000、schema user_version 注释决策、useDataManagement 三处 try/catch、SW runCapture 失败 badge '!'、迁移日志 inserted/skipped/failed 三数、stale-asset 放弃时 UI 提示、请求日志脱敏（req.path + query omitted）、快照 checkpoint 可选参数
- 排除项：err.statusCode 兼容、服务端错误链路、.catch(()=>{}) 各点、backupThrottle、pruneAuditLogs 跨格式、Express 5、旧备份恢复新 schema
- 顺带修：SiteCategory.test.ts 基线缺 afterEach import（阻断 vue-tsc）

## 第 16 轮（`3fd3c21`，5P1 + 14P2，视角：安全最终复检 + 依赖/供应链 + 性能补深）

**P1**

1. `audit:prod` 假绿 → 前端运行时库（vue/vue-router/pinia/pinia-plugin-persistedstate/vue-i18n）自 devDependencies 移入 dependencies（选 A）：`npm audit --omit=dev` 从此覆盖前端运行时攻击面。取舍：Docker prod-deps 的 `npm ci --omit=dev` 会把这些库装进运行时 node_modules（未经 Dockerfile prune 前约 10MB 级增量），dist 才是浏览器消费产物，二者互不影响，已在两处 Dockerfile 注释说明。
2. tsx 生产执行（Dockerfile/Dockerfile.runtime-min）→ 评估后**不改架构**：tsc 预编译需引入独立 dist-server、改 COPY/CMD/探针与 compose，与 AGENTS.md 既定单进程设计冲突；tsx/esbuild 供应链由锁版本 + npm audit + 源码自托管覆盖，两个 Dockerfile 加取舍注释。
3. js-yaml CVE override（4.3.0 恰落在 GHSA-5p4m-2wfm-xmqj 区间 `>=4.0.0 <4.3.1`，override 反而把 @redocly 声明的 4.3.1 强制降回脆弱版）→ override 4.3.0 → **4.3.1**（npm 已 backport 4.3.1/4.3.2），单副本 dedupe，全链清零。未走 swagger-jsdoc@6.3.0 升级路径（其仍声明 yaml 2.0.0-1 + @apidevtools/swagger-parser，纯为规避 js-yaml，升级无收益且有 glob@11 回归面）；openapi:types:check + swagger.runtime.test 全绿。
4. /api-docs.json 生产匿名公开 → 加 `API_DOCS_PUBLIC`（默认关闭）。关键：该文件是构建产物，express.static 会直接公开，须在 static **之前**拦截；openapi-typescript 类型链只读构建期 `dist/api-docs.json` 文件，不受运行时开关影响（已核实 generate-openapi-types.mjs）。.env.example / docs/ARCHITECTURE / OPERATIONS 同步。
5. 生产回退路径 `import('swagger-jsdoc')`（devDependency）→ 生产无静态 spec 时直接 404，不再动态 import（`npm ci --omit=dev` 部署场景不再 500）；dev 保留动态生成。server.test 新增 4 用例。

**P2** 6. favicon content-type 白名单 `/^image\//` → 显式位图枚举（png/x-icon/vnd.microsoft.icon/webp/gif/jpeg），SVG 回退 image/x-icon（补 svg/参数位图 3+5 用例）；7. favicon 上游 URL hostname `encodeURIComponent`（防 `&` 注入，补测试）；8. yaml monkey-patch 复核后仍必要（swagger-jsdoc 6.2.8 未升级，yaml override 2.9.0 与 2.0.0-1 声明的 API 差异仍在），swagger.ts 加复核注释；9. vite-plugin-compression 移除（上游停维护 + 服务端 compression() 已覆盖，仅纯静态托管有用），build 验证产物正常；10. bcrypt cost 10→12（哈希自带 cost，旧哈希自动读取，无兼容问题），测试断言 getRounds=12；11. loadData error.message 原文上屏 → 固定 `feedback.loadFailed` 文案，原文进 logger（更新 data.test）；12. SiteCard 图标 origin-first 候选顺序为有意设计（直连 origin 避免首页海量请求打满 /api/favicon 的 faviconLimiter 配额 + 浏览器 HTTP 缓存复用；单租户自托管隐私权衡可控）→ 加注释不改行为；13. UA 落库无上限 → requestContext 统一截断 256（session/audit 共用该源），补测试；14. migrateUsers level 原样入库 → `Math.min(3, Math.max(1, Number(level)))` 钳制 + 非法值回退 1（补测试）；15. typescript@6 vs openapi-typescript peer ^5 → 维持 .npmrc `legacy-peer-deps=true` + 注释（降级根 TS 到 ^5 会破坏 vue-tsc 链/`ignoreDeprecations:6.0`，等待 openapi-typescript 兼容 TS6）；16. Dockerfile `--legacy-peer-deps` 移除 + 各阶段 `COPY .npmrc ./`（peer 策略单一来源；docker:smoke 环境不可用，本地 `npm ci --dry-run` 通过）；17. @types/bcryptjs ^2.4.6 删除（bcryptjs@3 自带 umd/index.d.ts），typecheck 绿；18. swagger-ui-express "死依赖" → **核实前提不成立跳过**：server.ts:68 registerSwaggerUi 非生产动态 import + server.test 多用例 + docs/ARCHITECTURE 将其列为非生产诊断链路，移除会破坏 dev `/api-docs` 交互页，保留。

- 排除项：round-14 遗留、CSRF/SSRF/XSS/CSP/迁移安全；`npm run audit:dev` 其余 dev-only 告警（brace-expansion/fast-uri 链，round 外、audit:prod=0）。

## 第 17 轮（`f2cb153`，7 项 = 3P1 + 4P2，视角：发布就绪终检 + 跨轮综合回归 + 剩余项清点）

- **结论：有条件发布**。Pi + Kimi 独立审查：本地全部可跑门禁绿（含 docker:smoke 实测、audit:prod=0、版本四方 1.0.6）；跨轮回归 16 项抽检全绿、0 疑似回归；**DeepSeek 4 次尝试因 codeg folder 路径分裂（`d:/` 小写正斜杠 vs `D:\` 大写反斜杠）会话异常无报告**，已合并 folder 19 → 11（`scripts/merge_codeg_folders.cjs` 一次性脚本，用后即删）。
- **P1** dry-run 补 typecheck 门禁（RELEASE.md 步骤清单同步）；bootstrap bcrypt cost 收口（`BCRYPT_COST` export 共享，adminBootstrap 两处硬编码 10 → 12，补 hashCost 真实 bcrypt 测试）；dev override 升级 brace-expansion 2.1.4/5.0.9 + fast-uri 3.1.6 → **`npm audit` 全量 0**。
- **P2** TUNA 镜像文档对齐实际（改 docs 不改脚本）；release-dry-run 移除残留 gh release view 检查（改注释）；release.yml `inputs.version` 加 semver 正则校验；bootstrap cost 覆盖测试。
- 程序性阻断（非代码）：main 领先 origin 38 提交，16 轮修复从未经真实 CI/Release/Docker Publish——推送触发首次全链路由用户执行。

## v1.0.7 发布与后续运维（`150e19a` → `71eea62`，2026-09-02）

- **发布**：40 本地提交 squash 为单 release 提交 `150e19a`（371 文件，+10715/-5813），版本 1.0.6→1.0.7（四方对齐）。本地 CI 等价 13 项门禁全绿（含 coverage 超阈值、docker:smoke/browser regression 在 WSL 闭环实测）。CI 首次失败（hadolint 新版 DL3025）→ `1c3dd34` 修复 HEALTHCHECK 为 JSON 数组 → **CI/Release/Docker Publish v1.0.7 全绿**。
- **用户运维问题**（Cloudflare 部署）：会话表显示 CF 边缘 IP（104.22.x 等）而非真实客户端 IP。`371fcea` 加显式 `REAL_CLIENT_IP_HEADER`；`71eea62` 改为**默认自动检测**——新增 `src/server/utils/cloudflareIp.ts`（IPv4/IPv6 CIDR 匹配 CF 官方网段，含 `::ffff:` IPv4-mapped 归一化），socket 对端 ∈ CF 网段才采信 `CF-Connecting-IP`（CF 覆盖伪造值；绕过 CF 直连的对端不在网段，伪造无效）。`REAL_CLIENT_IP_HEADER` 对其他 CDN 保留优先。
- **待办**：ghcr `v1.0.7` 镜像为旧代码（版本未变自动发布跳过），需手动 Run Docker Publish（version=1.0.7, source_ref=main）或 bump 1.0.8 后重新部署，CF 真实 IP 才生效。工具约定：**push 需逐次明确授权**。

## 第 18 轮（post-release CF IP 链路专项，视角：新增代码深审 + 独立复现）

Pi / Kimi Code / DeepSeek 三 agent 独立审查 post-release 三个从未被审查的提交（`1c3dd34` HEALTHCHECK JSON、`371fcea` REAL_CLIENT_IP_HEADER、`71eea62` CF 真实 IP 自动检测），重点 `src/server/utils/cloudflareIp.ts` + `server.ts` IP 覆盖中间件。

**H**（Kimi + DeepSeek 独立复现 + 我方真实 Express 实测）：`server.ts` 用 `(req).ip = candidate` 覆盖 req.ip——Express 5 用 `defineGetter` 把 `req.ip` 定义为原型 getter-only accessor（无 setter），ESM 严格模式下直接赋值抛 `TypeError: Cannot set property ip ... which has only a getter` → **500**。后果：CF 部署凡带合法 `CF-Connecting-IP` 的请求全部 500（整个 CF 真实 IP 特性=全站不可用）。**漏网原因**：测试用 plain-object mock req（自带 own 可写 ip），永远复现不了真实 IncomingMessage 的原型 getter 抛错。修复：`Object.defineProperty(req, 'ip', { value, configurable: true, writable: true })`；补真实 Express 形态（原型 getter-only ip + 无 own ip）回归测试，先临时还原代码确认该测试必红再修复。

**M/L**：`parseIpv4Octets`/`parseIpv6ToBigInt` 用 `Number.parseInt` 部分解析（`1.2.3.04`/`12zz`/`0x1`/`1::1::1` 双压缩均被接受，与 `net.isIP` 语义不一致）→ 改整段正则校验（IPv4 拒绝前导零/尾随空白/字母后缀；hex 组 `^[0-9a-f]{1,4}$`；拒绝二次 `::`）；`isCloudflareAddress` IPv6 分支统一走 bigint + IPv4-mapped 位级判定（`>>32==0xffff && >>48==0`），修复 hex 记法 mapped（`::ffff:6810:102`）漏判与 dotted 分支过早 return 的形态。注释/文档精确性：config 显式头示例 `cf-connecting-ip` 改 `x-real-ip` + 明示"CF 部署勿设置（会关闭网段门禁盲信头值）"；OPERATIONS/.env.example 补多跳拓扑前提；cloudflareIp.ts 头注释补 WARP 边界限定语。补 13 项 cloudflareIp 边界测试。

**排除**：`.env.example` 裸 REAL_CLIENT_IP_HEADER（实际有 `#`，Kimi 误报）；parseInt 宽松在生产被 `net.isIP` 门控不可达；Pi 判 req.ip 遮蔽"实测安全"与实测矛盾不采信。

**结论**：CF 真实 IP 特性修复前不可发布——ghcr v1.0.7 仍是旧代码，重发镜像前必须先落地本轮 High 修复。

## 第 19 轮（基线 `7725ebe`，视角：第 18 轮修复回归 + mock-现实偏差专项 + 前端/共享一致性）

Pi / Kimi Code 独立全库审查 + DeepSeek 聚焦复核（第 18 轮修复正确性；DeepSeek 两次会话被取消，范围已由 Pi 真实 Express 5.2.1 复现覆盖，按规则跳过）。

**共识**：第 18 轮 High 修复正确无回归——defineProperty own 数据属性遮蔽原型 getter 稳定生效、注册顺序恒在 limiter/session/audit 消费方之前、`req.ips` 全库零消费者（覆盖后与 req.ip 分离但无害）、新回归测试有杀伤力非假绿、全库无其他 req 原型 getter 赋值点。修复工作流（CodeBuddy 子对话）：

- **A1** smoke 真机盲区：`runtime.smoke.test.js` 加真实 HTTP 用例——带 `REAL_CLIENT_IP_HEADER=x-smoke-client-ip` 登录后断言 **session 表 + audit 表** 落库 IP 为覆盖值（loopback 无法复现 CF 自动检测分支，该门禁由 server.test.js 直调用例覆盖）。5/5 过。
- **A2/A3/A4** 死代码：`useMainStore` 整个 store 删除（全库零 import）、扩展 `serverUrlPlaceholder` 死 key（zh+en）删除、`FRONTEND_SEARCH_SUGGESTION_PROVIDER_TYPES` 运行时死导出删除。
- **A5** 单文件内使用却 export 的 10 个 helper/常量去 export（flattenNodes/extractNodeText/getEngineProxyIcon/getEngineIconCandidates/normalizeSearchEngines/collectBranchItems/DEFAULT_APP_ICON/SITE_CARD_MIN_WIDTH/SITE_GRID_GAP/SITE_GRID_OVERSCAN_ROWS/normalizeThemeMode；同文件被跨文件引用的兄弟导出保留）。
- **A6** `realClientIpOverride` 提取为命名中间件（`server.ts`），server.test.js 改按 `函数名 === 'realClientIpOverride'` 精确定位，摆脱"首个函数式 use"顺序耦合。
- **B1** 新 `tests/server/middleware/ipKeyGenerator.test.js`（不 mock express-rate-limit）：真实 `ipKeyGenerator` 的 IPv6 /56 归一、跨 /56 分桶、IPv4-mapped（dotted+hex）→ IPv4、纯 IPv4 透传 4 用例。
- **B2** limiter.ts 头注释：说明全部桶 `skip: NODE_ENV==='test'` 意图 + 上游 v8 对 RFC 7239 `Forwarded` 头/直连拓扑的 `ERR_ERL_FORWARDED_HEADER` 自检告警经 stderr 每限流器至多一次、不抛 Express；本应用不支持 Forwarded，有意不做 validate 关闭（不掩盖反代误配置）。不改安全语义。
- **排除**：8 个疑似未引用 i18n key 核实均为间接引用；URL sink/v-html/竞态守卫在位；limiter/requestOrigin/authCookie 的 mock 形态与真实语义一致；query `fromEntries` 语义差异为 Info。
- **未做**：时区双事实源（`SUPPORTED_TIMEZONES` vs `buildTimezoneOptions` 有 locale label 需求无法机械合一）、`findIpOverrideMiddleware` 以外其余启发式——均记 Low 观察，留待后续。

**结论**：第 18 轮修复正确；本轮 14 项 Low/Info（死代码为主）已清，无新 High/M。验证门槛全绿（typecheck/lint/test:fast 193 文件 1048 测试/extension sync/openapi）。

## 第 20 轮（基线 `7f4e527`，视角：后端边界/错误路径 + 契约一致性 + 运维硬化 + 幸存者复扫）

Pi / Kimi / CodeBuddy 三 agent 独立全库审查；DeepSeek 本轮会话连续取消按规则跳过（M 项由 Pi/CodeBuddy 双报 + 我方源码/实证核实）。**2 M 无 High**，均经修复子对话落地（CodeBuddy 独立子对话）：

- **M1 SSRF 封锁被 IPv4-mapped IPv6 绕过**：`networkTargetSafety.ts` `isPrivateIpv6Address` 不识别 `::ffff:0:0/96`，`resolvePublicHttpTarget` 放行 `::ffff:127.0.0.1`（环回）与 `::ffff:169.254.169.254`（云元数据，实测连通）。修复：位级判定解出内嵌 IPv4（复用 cloudflareIp 解析），mapped 私网在 resolve 阶段即拒 + 4 用例测试。
- **M2 登录时序抹平失效**：`authLifecycleService` DUMMY 哈希 `$2b$10$` vs 账号 `BCRYPT_COST=12`，两条失败路径差 ~4 倍 bcrypt 耗时。修复：dummy 升真实 cost12 + 注释同步维护 + 导出锁定 + hashCost 测试。
- **B1-B12**：共享死契约类型删除（`avatar_url` 前提不成立保留+注释）、SystemHealth dbPath 死行/类型/locale、写路径 toast 非 ApiClientError 走固定文案、`POST /login` 401 豁免清本地态、语言切换刷新 document.title（registerTitleRefreshHandler）、`formatRelativeDate` 兜底对齐配置时区、`TOKEN_EXPIRES_IN` 删兜底改必填、AuditLog 清空后回第 1 页、悬空 parentId 增量写校验（含 add 吞错 ApiError 透传修正）、`auditService.clear` 改 `strftime('%s')` 数值比较、listen error 走 `shutdown`、登录失败日志补 IP 上下文。
- **结论**：第 19 轮变更三方复核零回归；门禁全绿（typecheck/lint/test:fast 195 文件 1064 测试/openapi）。

## 第 21 轮（基线 `dd45d41`，视角：第 20 轮回归 + 幸存者 + 历轮"排除项"复核翻案）

Kimi / DeepSeek 独立审查 + Pi（本轮会话异常多次，后经主会话转贴其完整报告）+ CodeBuddy 复核。**重点教训**：第 20/21 轮连续证明"历轮把 SSRF 封锁列为已排除"不可靠——第 20 轮 mapped v6、第 21 轮 IPv4-compatible/NAT64/6to4 都是"SSRF 三面排除"（第 11/16 轮）漏网同族。故按用户指示系统翻查历轮"核查后不报"项，发现 3 项实质遗漏。

**第 20 轮修复回归**：12 项改动零回归（Pi 逐点实证 14 项、Kimi/DeepSeek 复核一致）。

**A 档新增/翻案（安全/正确性）**

- **SSRF 封锁补锁三类内嵌 IPv4**（Pi 21 + 复核实证）：`networkTargetSafety.ts` 重构为单一 `extractEmbeddedIpv4Uint` 位级判定，在 mapped `::ffff:0:0/96` 之外补 **IPv4-compatible `::/96`**、**NAT64 `64:ff9b::/96`**（含云元数据形态）、**6to4 `2002::/16`**——解出内嵌 IPv4 后统一过 `isPrivateIpv4Address`；补 4 用例（8/8）。实测确认 WHATWG URL 特殊 IP 记法（127.1/十进制/0x/前导零/尾点/`@` 双向混淆）全部 BLOCKED（11/16 轮 URL 归一化面排除成立）；favicon 外呼仅把 hostname 当固定上游 query 参数（SSRF 排除成立）。
- **navigateFallback denylist 翻案（第 14 轮排除漏查）**：产物 NavigationRoute 无任何 denylist，SW 会把 `/api/**`、`/uploads/**`、`/api-docs.json` fallback 成 index.html（JSON 变 HTML，API_DOCS_PUBLIC 时 /api-docs.json 无法直连）。vite workbox 加 `navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /^\/api-docs/]` + build 产物验证。
- **`auditService.getLogs` 跨格式失序（第 20 轮 clear 同源读侧遗漏）**：`ORDER BY created_at DESC` 字符串比较在 T 形/空格形混存同日会错排 → 改 `ORDER BY strftime('%s', created_at) DESC` 与 clear/prune 同口径 + 测试。
- **`getErrorMessage` 幸存者统一（Kimi 21 主发现）**：14+ composable/组件调用点对任意 Error 原文上屏（网络层 'Failed to fetch' 中文 UI 突兀）→ `utils/errors.ts` 统一判定（ApiClientError 保留业务文案 / 纯对象服务端信封上屏 error / 其余走调用方 i18n fallback，含 plain-object 检测防 DOMException 误判）；data.ts `getWriteErrorMessage` 合并复用 + 补 logger.debug 留痕；新 errors.test.ts 5 用例 + 4 个既有测试改建模 ApiClientError。

**B 档（清理/测试/注释）**：SystemHealth fixture dbPath 残留 2 处删除；formatRelativeDate Intl 分支补测试（新 siteTableHelpers.test.ts）；i18n setLocale→title 接线补测试；`Bookmark = Item` 死别名、`User.created_at` 死字段删除；AuditLog/SiteTable 分页按钮 + select 补 aria-label（本地化 key）；server.ts listen-error 注释按真实路径重写；hashCost 测试断言对齐 `BCRYPT_COST`；networkTargetSafety IPv6 hostname `[]` 死路径注释精确化；时区双事实源互引注释（前端 9 = 服务端 9，当前一致但无共享）。

**历轮排除复核结论**：`.catch(()=>{})` 全库 7 处均 fire-and-forget；pruneAuditLogs/backupThrottle 无格式问题；pendingCapture/UserDialog.scss/swagger↔API.md/动态 key/`--el-*`/`--ui-font-display`/iconfont/Statistics 消费者均真实存在——仅上述 3 项翻案。

**结论**：第 20 轮零回归；本轮 4 A + 11 B（含 3 项排除翻案）已落地；门禁全绿（typecheck/lint/test:fast 197 文件 1079 测试/openapi）。

## 第 22 轮（基线 `9751566`，视角：第 21 轮回归 + 幸存者复扫）

Pi / Kimi 独立审查 + DeepSeek 聚焦复核（经转贴报告）。**第 21 轮零回归**：Pi 逐位验证 embed-v4 位级数学（NAT64/6to4/compat 掩码精确、分支互斥、`::1` 无冲突）；Kimi 验证 getErrorMessage 判定/12 调用点/locale 差集/aria-label 全对；DeepSeek 复核 4 点全部成立。

**修复项（CodeBuddy 子对话 A+B）**

- **A1**（Kimi M）`admin.ts` 登录/注册 catch 用 `error instanceof Error ? error.message` 会让网络层 'Failed to fetch' 原文上屏（LoginDialog）——21 轮 12 处收口漏网。改 `getErrorMessage(error, fallback)` + 内部业务失败载体改 `ApiClientError(0)`（普通 Error 会被判定为网络异常而吞掉）。补 8 用例。
- **A2**（Pi L，已实测）local-use NAT64 `64:ff9b:1::/48`（RFC 6052 §3.1 local-use / RFC 8215）漏锁——well-known `/96` 已锁但 local-use 前缀环回/元数据 ALLOWED。按位级 `value>>80 === 0x64ff9b0001` 对整块 `/48` 门禁（v4 恒在低 32 位，注释引 RFC 8215 checksum-neutral 任意 /96）。补 2 用例。
- **A3**（Pi L）audit `ORDER BY strftime` 精度整秒无决胜键 → 加 `, id DESC`。
- **A4**（Kimi L）`accountService` users 列表 `ORDER BY created_at DESC` 与 audit 同族跨格式 → 改 `strftime` + username 决胜（users 表 username 主键无自增 id）。
- **B1**（Kimi M）AppSelect combobox 全族 15 处无 author-provided name（内容不计 accName）→ 组件加 `label` prop + 逐个调用方补 `aria-label`（新增 table.rowsPerPage/manage.filterCategory/users.changeLevel 双语 key）+ 3 用例。
- **B2**（Kimi L）`formatRelativeDate` 缺 NaN 守卫（垃圾 lastVisited → Intl.format(Invalid Date) 抛 RangeError 崩整表）→ `Number.isNaN(date.getTime())` 返回 '-'，与 formatDateTime 对齐。
- **B3**（DeepSeek L）data.ts 5 处 2xx-but-falsy 防御路径 `new Error(t('feedback.*Failed'))` 被 getErrorMessage 判定为网络异常吞掉 → 改 `ApiClientError(0)` 保留细分业务文案。

**结论**：第 21 轮零回归；本轮 4 A + 3 B 落地；门禁全绿（typecheck/lint/test:fast 197 文件 1089 测试）。

## 第 23 轮（基线 `df4c7a3`，视角：供应链修正 + SSRF 精确性翻案 + 扩展 E2E 腐烂 + 扩展文案/a11y/文档）

Pi / Kimi 独立审查 + 主会话修复。修复项 CodeBuddy 主会话直接落地（10 项 = 2 M + 1 安全 L + 7 B 档）。

**A 档**

- **A1（M）qs override 钉死脆弱版**：`overrides.qs` 6.15.3 恰落 GHSA-x5fp-wj9c-mxmx / GHSA-4mjr-xmp4-gh2g（修复版 6.16.0）。升 `6.16.0`（registry 最新 = 6.16.0），npm install 后 lock/node_modules qs 均解析 6.16.0，`audit:prod` 恢复 **0**。
- **A2（安全 L，Pi+Kimi 双报，修正第 22 轮 A2）**：NAT64 local-use `64:ff9b:1::/48` 旧门禁按"低 32 位即 v4"提取——RFC 6052 仅 /96 NSP 如此，n=48 布局 v4 位窗更高、低 32 位是转换器忽略的 suffix，可构造低 32 位为公网 IP、真实内嵌 127.0.0.1 的地址骗过放行。改为对整块 `/48` **直接封锁**（`isPrivateIpv6Address` 前缀位级判断，不再尝试解 v4）；well-known `64:ff9b::/96`（固定 n=96，v4 恒低 32 位）保留提取逻辑。同步修 `extractEmbeddedIpv4Uint` 头注释（删除"任意更短 /96 NSP…v4 均放低 32 位"的错误表述）。测试翻案：原"local-use 内嵌公网 v4 放行"用例改断言 BLOCKED，新增 n=48 布局构造地址（`64:ff9b:1:7f:0:100:2a2a:2a2a`）BLOCKED；well-known /96 内嵌 8.8.8.8 仍 ALLOWED 用例保留。10/10 过。
- **A3（M）扩展浏览器级 E2E 腐烂**：`browser-extension-e2e.mjs` 引用已删 options 页（67c4ffe）、`statusText` 元素与旧文案，必然超时失败。CI 不引用该脚本（ci.yml 无 browser 门禁），包内脚本按 **选项 (a) 重写**对齐当前 UI：options 流程整体改写为 popup 内联连接卡片（`reconnectServerUrl/Username/Password` + `reconnectBtn`），移除 `waitForOptionsReady/waitForStatusText/optionsUrl` 与 options 失效流程，新增 session 过期→连接卡片重连闭环断言；其余 popup 搜索/编辑/删除/捕获当前页/重复检测/失败处理流程保留。所有选择器逐一与 popup.html 核对（无缺失 id），`node --check` 过；真实运行需 docker playwright 环境（WSL 闭环，本地不可跑）。

**B 档**

- **B1（L）扩展 toast 网络错误原文上屏**：与 Web 第 21/22 轮 `getErrorMessage` 收口同族。`utils/api.js` 不再把网络层错误包成 `ApiError(error.message)`（否则 'Failed to fetch' 会被显示侧当业务文案上屏），改原样上抛并导出 `getErrorMessage(error, localizedFallback)`（ApiError=服务端信封保留原文 / 字符串透传 / 其余网络原生错误→本地化兜底）；4 个展示点（bookmarks handleDelete/submitBookmark、categories createCategory、popup handleReconnect）接入。复用各流程既有本地化 fallback key（deleteFailed/addFailed/updateFailed/catAddFailed/connectFailed），未新增 i18n key。既有 2 测试改按真实形态建模 ApiError（原用裸 Error 带业务 message），另补 api-utils 网络错误非包装 + apiRequest TypeError 断言。
- **B2（L）popup 搜索区 a11y**：searchInput 补 `aria-label`（复用 `searchPlaceholder` 双语文案，updateUI 随语言刷新）；clearSearch "×" 补 `title` + `aria-label`，新增 `clearSearch` 中英 key（constants zh/en 对称，parity 测试保持绿）。
- **B3（L）扩展 README 文档漂移**：安装 step1"安装后自动打开设置页面"→"点击工具栏图标打开 popup 连接卡片（onInstalled 仅注册右键菜单）"；grep 清理 `设置页/options/` 残留（README 目录结构、快捷能力、E2E 描述注释、`utils/api.js` 注释、docs/OPERATIONS.md 覆盖描述）。
- **B4（L，Kimi）PWA manifest lang + SVG size**：manifest 显式 `lang: "zh-CN"`（站点默认 locale，避免插件默认 en 与中文 name 不符）；SVG 图标 `sizes` `"512x512"` → `"any"`。build 验证 `manifest.webmanifest` 产物 lang=zh-CN、svg sizes=any。
- **B5（L，Kimi）logo.svg 离线破图**：`includeAssets` 加 `'logo.svg'`；build 验证 `sw.js` 预缓存清单含 `{url:"logo.svg"}`（img src 的 `?v=2` 查询由 workbox 默认忽略 URL 参数匹配，预缓存 URL 不带 query 即可命中）。
- **B6（Info，Kimi）LoginDialog 注册兜底文案统一**：`LoginDialog.vue` 注册失败兜底 `admin.operationFailed` → `auth.registerFailed`（与 login 分支 `auth.loginFailed`、store `auth.registerFailed` 口径统一；store 恒返回非空 error，兜底实际不可达）。
- **B7（Info，Kimi）data.ts logger.debug 语义漂移**：`getWriteErrorMessage` 按 `error.status` 区分——status>0（服务端 4xx 拒绝）debug "rejected by server"；status=0（客户端防御性抛，2xx-但信封空）debug "rejected by client-side guard"。

**验证**：typecheck（server+web）、lint:check、test:fast（197 文件 1089 过 + 2 smoke 并行超时假失败降并发复跑 7/7 过）、audit:prod=0、extension:sync-common:check、versions:check、build（B4/B5 产物核验）。未改 src/shared → 不触发 openapi:types:check。

## 第 24 轮（基线 `4bfc13d` + 本地 `83f6eda`，视角：发布后回归 + 平台差异同族 + 运维/部署面 + 幸存者复扫）

Pi / Kimi 独立审查（DeepSeek 本轮会话被环境取消，按规则跳过；其网络/SSRF 聚焦面已由 Pi/Kimi 双覆盖）。**两提交零回归**：`4bfc13d`（SSRF IPv6 字面量免 DNS，剥 [] 时机在私网判定与 literal 快路径之前、全记法覆盖）与 `83f6eda`（compose 透传，空值语义闭环与 config 校验链一致）。

**新发现 8 项 = 全 L（0 H/M）+ 2 条 Info 文档**，主会话直接落地（CodeBuddy）：

- **L1 SSRF fe 段翻案（Pi，tsx 实测）**：`networkTargetSafety.ts` 私网 IPv6 回退表只覆盖链路本地 fe80-febf（fe8-feb），RFC 3879 已废弃站点本地 `fec0::/10` 与保留 `fe00-fe7f` 漏判——`http://[fec0::1]/`、`[fe00::1]` 实测 ALLOWED，20-23 轮 SSRF 封锁同族最后一段 fe 缝隙。修复：数值分支按首字节 `0xfe` 对整段 fe00::/9 位级封锁 + 4 新用例（fe00/fe0f/fec0/feff）。**排除项复核**：Teredo 2001::/32、ISATAP、文档段均不成向量（Pi+Kimi 独立结论一致），维持排除。
- **L2 auditService 内联裁剪失序（Pi）**：`log()` 兜底 DELETE `ORDER BY created_at ASC` 裸字符串——第 21/22 轮 clear/getLogs/accountService 同族收口的第三处漏网，混格式旧库同日会裁错行。改 `ORDER BY id ASC`（id 单调，与 cron 侧对偶）。
- **L3 sessionService 会话列表排序（Pi，Info~L）**：`getByUsername` `ORDER BY last_active_at DESC` 同族混格式（仅展示顺序）。改 `replace(last_active_at,' ','T') DESC, session_id DESC`。
- **L4 扩展"最近书签"时间解析（Kimi）**：`popup/modules/search.js` `Date.parse` 对历史空格格式行按本地时区解析（Web 侧第 4 轮 parseDateString 已修，扩展漏网）；`last_visited` snake 回退为死分支。修复：局部归一空格形补 `T`+`Z`（注释互引 web datetime.ts）+ 删死回退。
- **L5 测试依赖机器时区（Kimi，平台差异同族藏测试）**：`siteTableHelpers.test.ts` fallback 用例断言固定 `'4/1/2026'`——2026-04-01T10:00Z 在 UTC−11/UTC+14 渲染 03/31、04/02 必红。改现场用同一 `toLocaleDateString('en-US')` 算期望值（时区无关，断言 fallback 语义本身）。
- **L6 机密文件 mode:0o600 仅创建时生效（Kimi）**：`config/index.ts` `.jwt_secret` 与 `adminBootstrapService` `.admin_bootstrap_password` 文件已存在（旧版 0644/手工 touch/卷挂载）重写不收紧权限。修复：写后补 `fs.chmodSync(path, 0o600)`（Linux 生效、Windows 无操作；测试 fs mock 补 chmodSync + 断言）。
- **L7 CI `git diff --check` 空转（Pi）**：无参数比较工作树 vs 暂存区，CI 全新 checkout 恒空，从未拦截过任何东西。修复：checkout 加 `fetch-depth: 0`，步骤改对 `pull_request.base.sha` / push `before` 做 `git diff --check "$base...HEAD"`。
- **L8 Dockerfile.runtime-min CRLF strip 漂移（Pi）**：主 Dockerfile 有 entrypoint `tr -d "\r"`，runtime-min 只 chmod——CRLF 脚本在 exec 启动即失败（第 8/9 轮同步清单漏此项）。修复：runtime-min 补同款 strip + 互引注释。
- **Info（Pi+Kimi 双报）compose 注释示例打架**：`cf-connecting-ip` 示例与 .env.example"CF 直连勿设（关闭网段门禁）"有张力。改示例 `x-real-ip` + 补"CF 直连留空、反代需先把客户端 IP 写入所选头"前提。
- **负面清单（防下轮重报）**：尾点 FQDN、Teredo/ISATAP、IPv4 文档/基准段（fail-closed）、时区静态白名单、`TextDecoder gb18030` small-icu 回退、全部测试 mock DNS、`.gitattributes` eol=lf、mapped 公网 v6 literal V6ONLY 平台差异（Info 不改）。

**验证**：typecheck（web+server）、lint:check、test:fast（197 文件 **1092** 测试过）、integration + smoke 手动跑（18 过）、extension:sync-common:check、versions:check、openapi:types:check、build 全绿。

## 第 25 轮（基线 `0f350bc`，视角：全量盲审——去锚定从零全库 + 台账真实性与跨轮集成）

用户发起"完整审查"轮：**Pi / Kimi 各自【不带台账】从零全库盲审**（明确要求不读 REVIEW_LEDGER/CHECKLIST，防锚定），事后主会话对账。DeepSeek 未参与本轮。**0 H**，**3 M（均为 24 轮台账未覆盖的真实边界）+ 6 L（Pi）+ 6 L（Kimi）**。两 agent "已核实无问题"大清单与 24 轮排除项互为印证。

**M 级修复**

- **M1 footerHtml 超界字符引用 → 500 放大**（Kimi）：`footerHtml.ts` `String.fromCodePoint` 对 `&#1114112;`（>0x10FFFF）抛 RangeError；写路径 500，而 `settingsService.getPublic()`（settingsService.ts:98）读路径每次跑同一清洗——越界值经 restore/手工 SQL 入库后公开 `GET /api/settings` 对全体访客持续 500。修复：`decodeCodePoint` 对码点 0..0x10FFFF 守卫、越界保留原文（后续 escapeHtml 转义 &），新增 4 单测。
- **M2 导入 `private:true` 静默丢弃 → 私密书签变公开**（Kimi）：itemSchema/categorySchema 仍接受 `private` 布尔（validation.ts:91/103）但无 private 列、写路径不落库——旧导出/第三方 JSON 导入后以 level 0（游客可见）入库。修复：`normalizeBulkPayload`（bookmarkCommandService.ts）`applyLegacyPrivateFlag` 把 `private:true` 且无显式 level≥1 的项/分类映射为 level 1（USER）；显式更高 level 保留。补 2 单测。
- **M3 拖拽无法落入"未分类"**（Kimi）：`useSiteDrag` commitMove 要求 `finalTargetId>0`，未分类虚拟分类 id=0 → 静默 no-op（API 本身支持 categoryId=0）。修复：落点判定区分"无落点"与"未分类落点"（hoverCategoryId=0 + hoverItemIndex≥0 即合法），targetCategoryId 统一为 0 走 moveItem。补单测。

**Pi L 级修复**

- **L1 /api/health 匿名公开部署指纹**：getHealth 增加 `{detailed}`，`/health` 前挂 `optionalAuth`——匿名探活（healthcheck/负载均衡）只返回最小负载（status/version/timestamp/checks.database.ok），登录管理员才返回 runtime/memory/cache/queries/uptime 明细（系统健康面板消费不受影响）。API.md/ARCHITECTURE/PERFORMANCE_TESTING 同步注明。
- **L3 登录限流把成功登录计入桶**：合法用户 15 分钟内反复登出登入 >10 次会自我 429。loginLimiter/loginIpLimiter 加 `skipSuccessfulRequests: true`（express-rate-limit v8 支持，只计 4xx/5xx 失败），限流配置快照测试同步。
- **L5 bookmarkImport `url.startsWith('http')` 过宽**（会匹配 httpx://）→ 双前缀 `http://`/`https://`（服务端本就兜底，纵深收紧）。

**Kimi L 级修复**

- AdminSidebar `avatar_url` 死 img 分支删除（buildAuthUser 恒不下发，保留首字母占位 + 注释）；`ADMIN_USERNAME` validateEnv 格式校验（3-30 位字母/数字，与 loginSchema 一致，防 bootstrap 建号后无法登录的配置陷阱，补单测）；server.ts 缺失 `/uploads/*` 返回 404（此前被 SPA fallback 吞成 200 HTML，破坏删除后清理的 404 语义）；api/client.ts `decodeURIComponent(filename*)` try/catch 兜底畸形头值；useBookmarkImportDialog 关闭延迟 reset 的 setTimeout 卸载时清理；sanitizeText 非字符串真值改走统一 trim+控制字符+截断管线。

**已记录不修(Info/取舍)**:Pi L2(link-check 公网主机端口扫描--admin 权限 + HEAD + 超时,需产品决策是否限 80/443；第 33 轮重新评估后维持 wontfix，理由见第 33 轮 C3）、L4（cache useClones:false freeze 会破坏 patchItemClickInCache，宜加注释）、L6（sort_order 删除不压缩，拖拽自愈）；Kimi「管理员互相改密/降级」为已接受语义（bootstrap 自动恢复主管理员 level）——**已过时/固定**：该语义已被第 27 轮（主管理员禁改名/降级）+ 第 30 轮（管理员自降级拒绝）收口，原「接受」结论不再适用；integration sleep(50) 误导注释(无害);compose env_file 措辞(本就 fail-fast)。

**验证**：typecheck（web+server）、lint:check、test:fast（198 文件 **1101** 测试过）、integration + smoke 手动跑（18 过）、extension:sync-common:check、versions:check、openapi:types:check、build 全绿。

## 第 26 轮（基线 `eb8268d`，视角：本地三提交回归 + 幸存者复扫）

Pi / Kimi 独立全库 + DeepSeek 聚焦复核（对照台账只报新增）。**本地三提交（83f6eda/0f350bc/eb8268d）零功能回归**；新发现集中于第 25 轮 health 分级修复自身两个缺口（M1 三路同报、M2 Kimi）+ 3 个 L。6 处已落地：

- **M1（Pi+Kimi+DeepSeek 同报）health 匿名"最小负载"仍整份下发 DB 统计**：`systemHealthService.ts` 只剥 dbPath，匿名 `checks.database` 含 `userCount/itemCount/categoryCount/size/tables/writable/journalMode`——与 JSDoc + API.md 承诺矛盾；测试用嵌套 `objectContaining` 结构性放过。修复：匿名恒 `{ ok }`，全量统计移入 detailed。
- **M2（Kimi）SystemHealth 面板会话失效崩溃（eb8268d 新增路径）**：`/health` 挂 optionalAuth 后会话失效返回 200+最小负载（不再是 401），模板直读 `checks.cache.hits`/`runtime.nodeEnv` → TypeError，且绕过 client 401 清登录态。
  - **根治（M1+M2 一并）**：新增管理员端点 `GET /admin/system/health`（authenticate+requireAdmin，@swagger 注解同步）；公开 `/health` 去掉 optionalAuth、恒最小负载；前端 `adminApi.getSystemHealth` 改走 `/admin/system/health`——面板会话失效恢复真 401（走既有清登录态链），匿名永拿不到明细。openapi.generated.ts 重新生成并提交；smoke 补"匿名最小 / 管理员详细"双断言（含否定 userCount/runtime）。
- **L1（Kimi）JWT secret chmod 覆盖面窄**：chmodSync 只在"重新生成"分支执行，旧版遗留的非空 0644 `.jwt_secret` 走读取分支 early-return 永不被收紧。修复：读取分支返回前补幂等 `chmodSync(0o600)`。
- **L2（DeepSeek）ADMIN_USERNAME 空白绕过**：validateEnv 先 `.trim()` 再校验，但 `DEFAULT_ADMIN_NAME` 不 trim、bootstrap 按原文建号——`" admin "` 过校验却建出带空白账号仍无法登录。修复：`DEFAULT_ADMIN_NAME` 取值处统一 `.trim()`（含注释）。
- **L3（DeepSeek）`applyLegacyPrivateFlag` 注释与实现不符**：注释称"未显式给到 level≥1 才映射"，实现 `level<1` 即覆盖（显式 level:0 也被提升，Joi default 后无法区分显式/缺省 0）。修复：注释改为"private:true 为权威可见性位，level<1 一律提升为 1，显式更高 level 保留" + 补显式 level:0 边界测试。
- **Info 顺带修**：ci.yml force-push 后 `github.event.before` 可能不在 fetch 历史 → diff-check 假红，补 `git cat-file -e` 兜底 origin/main；swagger HealthCheck schema 补分级 description（完整字段仅 /admin/system/health）。
- **记录不修（Info）**：`&#0;`→NUL 微瑕（HTML 解析替换 U+FFFD，无安全影响）、useSiteDrag 鼠标路径 hoverCatIndex 死分支（有单测固化兜底语义，留待对称重构）、import dialog 关闭 200ms 内重开清新状态（pre-existing）。

**验证**：typecheck（web+server）、lint:check、test:fast（198 文件 **1102** 测试过）、integration（11）+ smoke（19）全过、openapi:types（生成文件随提交）、versions、extension sync、build 全绿。

## 第 27 轮（基线 `48c7de2`，视角：全量盲审——去锚定从零全库）

Pi / Kimi 不带台账从零盲审（DeepSeek 会话第二次被环境取消，跳过；其网络/SSRF 范围由 Pi/Kimi 独立覆盖）。**0 H**；M1 双报 + M2（Kimi）+ 4 L。6 处已落地：

- **M1（Pi+Kimi 双报）`PATCH /admin/users/:username` 无 password 时整个 payload 零校验**：level 任意类型原样入库（`"boss"` 使 `requireAdmin` 的 `"boss" < 3`=NaN **fail-open** 放行）、newUsername 任意字符可把账号改砖、`DEFAULT_ADMIN_NAME` 可被改名/降级。修复：新增 `adminUpdateUserSchema`（newUsername alphanum 3-30 / level int 0-3 / password 可选强密码，min(1)，unknown(true) 容忍旧字段）在 updateUser 恒校验；`requireAdmin` 改 fail-closed（`Number.isInteger(level)` 判定）；`resolveAuthenticatedUser` 对 level 做 `Number()` 归一兜历史脏数据；**禁止重命名/降级主管理员**（更新 round-25"管理员互改密/降级可接受"记录——主管理员现受保护）。补 3 组单测 + identityService 测试模块 mock 适配。
- **M2（Kimi）删除类操作静默失败**：`store/data.ts` `deleteCategory`/`deleteItem` 无错误上屏，调用方 `catch { /* cancel */ }` 把"取消确认"与"API 失败"混吞（批量删除有回滚+toast）。修复：两个 delete 方法补 `catch → ElMessage.error(getWriteErrorMessage(e)); throw`（本地只在成功后移除，无需回滚）。
- **L1（Pi）SSRF IPv4 表补段**：`isPrivateIpv4Address` 补 RFC 2544 `198.18.0.0/15` 与 RFC 7335 `192.0.0.0/24` + 3 用例。
- **L2（Kimi）匿名 `/health` 去掉精确 version**（部署指纹）——version 仅管理员端点返回；测试/API.md/smoke 同步（smoke 补匿名无 version、管理员有 version 双断言）。
- **L3（Pi）GHA 脚本注入面**：`docker-publish.yml`/`release.yml` 把 `inputs.version/source_ref/force` 及 event 字段直接内插进 `run:` → 改经步骤级 `env:` 传递后引用 `$VAR`（run-name/with 表达式保持原样）。
- **L4（Kimi）扩展 popup 图标首字符补 `escapeHtml`**（单字符本不可利用，消毒纪律一行收口）。
- **记录不修（Info）**：Clock 硬编码中文（round-1 已记）、normalizeUrl 静默改写（台账取舍）、icon-unavailable 懒清理、handleJsonImport 客户端不校验（服务端 400 兜底）、favicon hostname 外泄第三方（inherent）、全局滚动条隐藏。

**验证**：typecheck（web+server）、lint:check、test:fast（198 文件 **1105** 测试过）、integration（11）+ smoke（19）全过、versions、extension sync、openapi types、build 全绿。

## 第 28 轮（基线 `3ce6b56`，视角：全量盲审——去锚定从零全库）

Pi / Kimi 不带台账从零盲审。**0 H**；M1 双报（Pi 定 M）+ Kimi 组 M2-M4 + L1-L4。8 处已落地：

- **M1（双报）会话复用不续期**：`sessionService.create` 同 username+IP+UA 复用只刷 last_active_at——`remember`(90 天) 重登拿到 90 天 JWT/cookie 但 sessions 行仍按旧 30 天过期 → 提前 401 与 UI 承诺不符。修复：复用分支同步把 `expires_at` 续到本次请求到期点。Pi 主张的"轮换 sessionId 踢旧 token"副作用会误伤同 UA 多 profile/多窗口正常复用（且既有 password 变更/revoke-others 已提供吊销语义），记录取舍不采纳轮换。补单测（reuse 续期断言）。
- **M2 locale 缺 key**（已核实部分成立）：`common.empty`/`common.total` 两语言均缺失但被 AuditLog 空态/分页、SessionManager 空态使用 → 用户看到字面量。修复：空态改用已存在的 `common.noData`，分页新增 `common.total`（zh "共"/en "Total"，双文件同加保 parity）。Kimi/Pi 附带指控 `table.deleteSuccess` 缺失——主会话当时**误判为误报**（错认 zh/en:223 处的 deleteSuccess 属 `table` 段，实属 `admin` 段）；第 29 轮复核确认为**真实缺失**并补 key（见第 29 轮）。
- **M3 SessionManager 撤销静默**：`catch { // 取消操作 }` 混吞 confirm 取消与 API 真失败（round-27 delete 修复的同族漏网）。修复：`error !== 'cancel'` 时 `ElMessage.error(getErrorMessage(...))`（revokeSession/revokeOthers）。
- **M4 DataManager 增改保存静默 + 注释撒谎**：saveCategory/saveItem catch 注释"Error handled in store"，store add/update **只 throw 不上屏** → 后台增改分类/书签失败无反馈；右键 togglePin 同根。修复：useDataManagement/useContextMenuActions 层补 `getErrorMessage` 上屏，注释与事实对齐。
- **L1（Kimi）右键移动分类双重 toast**：store 上屏后 rethrow 无 catch → 全局 unhandled 再弹一次。修复：context menu `moveCategory` 补 catch 吞（store 已回滚+上屏）。
- **L2（Kimi）扩展 `ui.js` `data-id` 未转义**：两按钮 data-id 补 `escapeHtml`（id 恒为服务端数值，纪律性一行）。
- **L3（Pi）审计分页 page 无上限**：钳 `≤ 10000`，防 `OFFSET 5e10` 无谓全表跳过。
- **L4（Kimi）DataManagerToolbar FileReader 缺 onerror**：补读取失败上屏 + 清 input。
- **记录不修（Info/取舍）**：CSP img-src `http:`（http 部署兼容，round-17 记录）、style-src unsafe-inline（Element Plus 依赖）、normalizeUrl 剥离功能性参数（台账取舍）、会话不轮换（见 M1 说明）、用户增删对话框在服务端响应前关闭重置（重填可接受，UI 边角）。`table.deleteSuccess` 是否缺失见上方更正——实为真实缺失，round-29 已补 key。

**验证**：typecheck（web+server）、lint:check、test:fast（198 文件 **1106** 测试过）、integration（11）+ smoke（19）全过、versions、extension sync、openapi types、build 全绿。

## 第 29 轮（基线 `d26f0a2`，视角：全量盲审——去锚定从零全库）

Pi / Kimi 不带台账从零盲审（首轮两路均交付失败——Pi 终态空、Kimi 卡死，按约束重跑成功）。**0 H / 0 M（Pi）**；Kimi 提出 1 M（部署拓扑级）+ 双路若干 L。5 处已落地：

- **M1（Kimi）compose 直连拓扑下 TRUST_PROXY 默认 true → 伪造 XFF 换桶绕过按 IP 限流**：`ports: 8080:8080` 无受信反代却未显式 `TRUST_PROXY=false`。修复：compose 加 `TRUST_PROXY: ${TRUST_PROXY:-false}` + 注释（有受信反代/入口者自设 true；CF 专用头与 socket 网段门禁路径不受影响）。
- **L1（Pi+Kimi 双报）`table.deleteSuccess` 缺失（主会话 round-28 误判为误报）**：round-28 已修 `common.empty/total` 但漏了此 key（zh/en:224 处同名键属 `admin` 段，`table` 段确实没有）；删除书签/批量删除成功 toast 显示字面量。修复：zh/en `table` 段补 `deleteSuccess`，双文件同加保 parity。
- **L2（Kimi）`useSiteDrag` commitMove 双重错误 toast**：store `moveItem` 已上屏并 rethrow，commitMove catch 再弹 → 改空吞（注释说明），移除不再使用的 getErrorMessage import；单测改为断言"不重复弹"。
- **L3（Kimi）`useBatchActions.handleBatchMove` 双重错误 toast**：同模式改空吞 + 移除 import；单测同步。
- **L4（Kimi）stale 注释/文档残留 version**：`system.ts` 路由注释与 `swagger.ts` HealthCheck description 仍称匿名含 `version`（round-27 已从实现移除）→ 改"status/timestamp/checks.database.ok"；openapi.generated.ts 随 spec 重生成并提交。
- **记录不修（Info/取舍）**：Pi L1 revokeOthers 在无 Cookie sessionId 的 bearer/CLI 上下文语义未定义（前端恒走 cookie；改 authVersion 会连调用者一起登出）；Pi L3 `getErrorMessage` 对纯对象信封 message 直上屏（服务端 5xx 已脱敏）；Pi L4 `handleBatchDelete` 空 catch 依赖 store toast（同模式已有先例）；Kimi L5 撤销已过期会话返回 403 语义近 404（纯 UX）；Kimi L6 audit UA 无上限——**UA 已在 requestContext 统一截 256**（round-16），details 一般固定文案，风险低；测试环境限流 skip 盲区、无 sessionId 旧 JWT 兼容窗、会话复用按 ip+ua 归并取舍（均已有注释/台账）。

**验证**：typecheck（web+server）、lint:check、test:fast（198 文件 **1106** 测试过）、integration（11）+ smoke（19）全过、versions、extension sync、openapi types（生成文件随提交）、build 全绿。

## 第 30 轮（基线 `57d3d72`，视角：全量盲审——去锚定从零全库）

Pi 盲审完整交付（0 H，1 M + 若干 L）；Kimi 三轮交付失败（round-29 卡死取消一次、本轮空终态一次、early-empty 一次，平台终稿丢失），后由用户补来 Kimi 视角完整报告并指定先做两项核验（locale 动态键、7 本地提交一致性）再修。主会话核对：**locale 使用侧→定义侧 387=387 无真实缺失（唯一"缺失"为动态拼接 menu./userLevel. 与注释误报）**；**7 个本地提交与代码逐一吻合**。合并 7 处已落地：

- **M1（Pi）cache ECACHEFULL 语义误解**：node-cache `maxKeys` 满载**抛 ECACHEFULL**（已核 node_cache.js:411-413，且在覆盖判断前）而非注释所称"逐出最旧"；search/data/categories 的 `cache.set` 无防护 → 刷不同关键词填满 1000 键后可致新增缓存写 500。修复：`CacheRuntimeService.set` try/catch 降级 debug+返回 false（缓存写失败 ≠ 业务失败）+ 注释纠正 + 满载单测。
- **M1（Kimi 视角）管理员自降级无自锁**：round-27 只护主管理员，非主管理员可 `PATCH` 自己 `level<ADMIN` → 会话全撤后若站内无他管理员即锁死（deleteUser 有"删自己"保护，update 无）。修复：`context.operator === targetUsername && level<ADMIN` 拒绝 + 单测（降他人仍允许）。
- **M2（Kimi 视角）`useUserManagement.runUserAction` 双 toast**：成功 toast 先于 `await fetchUserList()`，刷新失败落 catch → "成功+失败"矛盾提示且返回 false 跳过自改名同步。修复：刷新单独 try/catch 降级为 warn 日志，动作结果不受刷新影响。
- **L1（Kimi 视角）游客回前台永不刷新**：App.vue visibilitychange 仅管理员触发（loadData 有 in-flight/saving 保护）。修复：游客同享 5s 节流回前台刷新。
- **L3（Kimi 视角）`systemHealthService` JSDoc 残留 version**（round-29 只改路由注释+swagger，漏 service 自身）→ JSDoc 与实现对齐。
- **L5（Kimi 视角）批量 ids 无上限** → `bookmarkBatchDeleteSchema`/`bookmarkBatchMoveSchema` 加 `.max(500)`（防 IN 展开超 better-sqlite3 变量上限 32766 落 500）。
- **L2（Pi）`adminApi.updateUser/deleteUser` 用户名补 `encodeURIComponent`**（与 deleteUpload 纪律一致）。
- **待定记录**：SW 60s 轮询 + skipWaiting 自动刷新可能在编辑中途丢未保存输入（建议改手动提示条，UI 改动较大暂缓）；`sessions.revokeCurrent` 键名与使用场景相反（纯命名，暂不改）；前后端 URL 去重口径不一致（后端精确 vs 前端 normalizeUrl，低危一致性）；getOrSet 无生产调用方；任 level-3 管理员可改主管理员密码（平权取舍，运维文档化建议）。**locale 核验方法与 7 提交核对已记录于本段上文。**

**验证**：typecheck（web+server）、lint:check、test:fast（198 文件 **1108** 测试过）、integration（11）+ smoke（19）全过、versions、extension sync、openapi types、build 全绿。

## 第 31 轮（基线 `d615b0f`，视角：全量盲审——去锚定从零全库）

Pi 盲审交付（**0 H / 0 M**，3 L）；Kimi 起始即卡住被取消（未产出）。3 处已落地：

- **L1（release.yml 触发步注入面，round-27 env 化只做一半）**："Trigger Docker publish" step 把 `steps.plan.outputs.workflow_ref/source_ref/version` 直接内插进 `run:` shell——workflow_ref 在 dispatch 场景源自 git 分支名（可含 `"`/`$`/反引号）。修复：该 step（与 Skip step 的 reason）同口径走 `env:` 引用。
- **L2（SSRF 前缀表补段，顺带收窄 round-27 的过宽判定）**：原 `first===192 && second===0` 实为 /16 过宽；改为 third 参与保持 /24 精确，并补 RFC 5737 文档测试 TEST-NET-1/2/3（`192.0.2.0/24`、`198.51.100.0/24`、`203.0.113.0/24`）与已废弃 6to4 relay anycast `192.88.99.0/24` + 4 用例（均不可公网路由，一致性加固）。
- **L3（users JSON 迁移不校验用户名）**：迁移用户名取自 `users/*.json` 文件名、未走注册/登录 alphanum 3-30 校验——超长/特殊字符会污染审计展示且永远无法登录。修复：不合规跳过并告警（与明文密码同处置），补单测；既有夹具 `ok.json`（2 字符）改 `okay.json` 以保留"字符串 level"覆盖。
- **记录 Info**：compose `env_file:.env` 需空文件存在（README 说明项）；docker-publish release tag 未做 semver 校验（健壮性）——**已过时/固定**：第 32 轮 L2（f67129d）已为 docker-publish 独立 dispatch 的 version 加同款 semver 正则校验；main.ts SW 轮询不清理（App 生命周期有意）；round-30 待定项（SW 手动提示条、`revokeCurrent` 改名、URL 去重口径）继续挂起——其中 SW 手动提示条与 URL 去重口径已于第 33 轮处理，`revokeCurrent` 改名维持不改。

**验证**：typecheck（web+server）、lint:check、test:fast（198 文件 **1110** 测试过）、integration（11）+ smoke（19）全过、versions、extension sync、openapi types、build 全绿。

## 第 32 轮（基线 `40a8647`，视角：全量盲审——去锚定从零全库，双报告合并）

Pi 交付（0 H，1 M + 若干 L）；Kimi 起始卡住被取消，后由用户补来其视角完整报告（0 H，1 M 隐私面 + 3 L）。用户先在 Pi 报告后选择"先停"，补入 Kimi 报告后批准全修 6 处：

- **M1（Pi）IPv6 未指定地址拼写变体绕过 SSRF**：`isPrivateIpv6Address` 仅在 `normalized==='::'` 拦零地址，`::0`/`0:0:0:0:0:0:0:0`/`0::0`/`::0.0.0.0` 等解析为 `0n` 却放行 → 直连按本机处理。修复：`value===0n` 一律判私有（保留字符串分支兜底）+ 4 用例。
- **M1（Kimi 视角）认证态变化不刷新数据（登出隐私面）**：登出/401 清态后 level1-3 私有书签原样残留（同机旁站可见），登录后仍游客视图。修复：App.vue `watch(isAuthenticated → dataStore.loadData())` 统一两个方向（loadData 自带去重/写保护）。
- **L1（Pi）扩展 popup 搜索无乱序防护**：加模块级 `searchRequestSeq`，旧响应/旧错误丢弃；`clearSearch` 亦作废在途。
- **L1（Kimi 视角）AdminDashboard 会话中途过期不跳转**：`watch(isAuthenticated)` 失活即 `router.push('/')`。
- **L2（Kimi 视角）docker-publish 独立 dispatch 的 version 无 semver 校验**（可向 metadata-action yaml 注入行）：复用 release.yml 同正则，非法即 fail。
- **L3（Kimi 视角）会话复用直接覆盖 expires_at 会把长档位会话缩短**：改"仅向更长方向续期"（`parseStoredExpiresAtMs` 兼容空格形；保留 round-28 的"90 不被旧 30 卡死"）+ 单测。
- **待定记录**：Pi L1 bulk 导入悬空 parent_id/categoryId 跨组∪现库校验（改动较大，专项）；Info（pinia persist 死依赖、迁移不洗 URL、Windows 保留设备名、REAL_CLIENT_IP_HEADER 无条件采信等）记录台账。

**验证**：typecheck（web+server）、lint:check、test:fast（198 文件 **1112** 测试过）、integration（11）+ smoke（19）全过、versions、extension sync、openapi types、build 全绿。

## 第 33 轮（基线 `f67129d`，视角：台账清账 + 死代码/死依赖清理 + 历轮待定项专项收口）

主会话指定清单（A/B/C 三类），Pi 直接落地（提交：`ea4c85c` = B1、`58265a3` = C1+C2、`6999cfb` = B2+C4、本条目所在提交 = A）。

**A 类 · 台账清账**

- 状态表补 `f67129d` = 第 32 轮提交行 + 当前状态（10 提交未推送，origin/main = 4bfc13d）。
- 三笔已过时项移到历史/标 fixed：(a) 第 6 轮遗留 `MaxIdRow` 死类型——第 33 轮全库 grep 核实已不存在于代码（仅台账引用）；(b) 第 25 轮「管理员互相改密/降级 accepted」——被第 27 轮（主管理员禁改名/降级）+ 第 30 轮（自降级拒绝）收口；(c) 第 31 轮 Info「docker-publish release tag 未做 semver 校验」——第 32 轮 L2 已修。

**B 类 · 死代码/清理**

- **B1 `getOrSet` 删除**：全库 grep 确认生产代码零引用，唯一消费者是测试该死方法本身的两个 describe/用例（cacheService.test.js `getOrSet 方法` 4 用例、cacheRuntimeService.test.js stats 用例）→ 删除方法 + 同步删/改对应测试（保留 stats 覆盖，改用 get/set/del 驱动）。
- **B2 `pinia-plugin-persistedstate` 死依赖移除**：main.ts import + `pinia.use`、vite.config.ts manualChunks 提及、vite-env.d.ts `declare module`、main.test.ts doMock、package.json 依赖（npm install 刷新 lock）、ARCHITECTURE.md 运行时库措辞同步（docker 目录无提及，核实无需改）；`npm audit --omit=dev` 保持 **0**。
- **B3 全局滚动条隐藏复核——Info 不改**：App.vue 全局 `::-webkit-scrollbar{width:0}` 为有意设计（注释明示「装饰性页面滚动隐藏，数据表格恢复」），第 14 轮 #24 已恢复 `.sn-table-scroll`、第 27 轮已记 Info。本轮复核受影响面：弹窗 overflow 容器（第 14 轮 #11 的 max-height+overflow-y 生命周期）、侧栏/搜索结果等仍无滚动条可视提示，但滚轮/触摸/键盘均可滚，属装饰性隐藏的既定取舍；无实际可达性阻断，维持不改。

**C 类 · 真实未决**

- **C1 bulk 导入悬空父引用服务端兑底（第 32 轮 Pi L1 专项）**：saveData 是全量替换语义（事务内先 DELETE 全部再 INSERT），故合法引用集合 = 导入文件内分类 id 集——「文件内 ∪ 现库」不适用，现库分类此时已全部被替换，指向现库的引用导入后必然悬空（这正是悬空的来源）。`categories.parent_id` 无 FK，悬空静默入库令子分类从首页树消失；`items.category_id` 有 FK（database.ts `foreign_keys=ON`）但报错为泛化 SQLITE_CONSTRAINT 400。修复：`bookmarkMutationService.saveData` 在写前备份/删除**之前**新增 `assertBulkReferences` 精确校验，报错带条目序号+名称；前端 useImportExport 已先行 remap（无映射归根/归未分类），本校验是原始 API/CLI 导入的服务端兑底。补 3 单测（悬空 item categoryId / 悬空 category parentId / 文件内引用通过）。
- **C2 前后端 URL 去重口径 + 迁移不洗 URL——注释收口不改行为**：核实后端去重键 = `items.url` UNIQUE 精确原始字符串（`normalizeOptionalUrl` 只校验不归一化）；前端 useImportExport 合并去重键 = 共享 `normalizeUrl`（协议补全/主机小写/剥尾斜杠/剥跟踪参数），口径确不一致。结论：服务端为权威、不引入历史数据迁移（写入侧归一化需同步改写存量 URL，风险 > 收益）；在 databaseSchemaService（UNIQUE 约束处）与 bookmarkCommandService.normalizeBulkPayload 各加注释说明差异与取舍。
- **C3 link-check 公网端口扫描——wontfix（产品决策）**：现状：`POST /check-links` 挂 `authenticate + requireAdmin`（system.ts），目标经 `resolvePublicHttpTarget` 全量 SSRF 门禁（私网/保留段/重绑定防护，20-32 轮持续收口）后才 HEAD，且逐条 5s 超时。残余暴露 = 受信管理员可让服务器对任意公网 host:port 发 HEAD。决策：单用户自部署场景管理员本就可配置任意书签/探测目标，限制非 80/443 端口会误伤自建服务（如 https://example.com:8443 这类常见导航书签），收益低于误伤 → 维持 wontfix，此前第 25 轮 Info 同口径。
- **C4 SW 自动刷新丢未保存输入（第 30 轮待定项）**：根因不止 main.ts 的 `updateServiceWorker(true)`——registerType 'autoUpdate' 下插件自动注入 `self.skipWaiting()`（dist/sw.js 顶层），新版本一安装即接管页面并 reload。修复：vite.config `registerType: 'autoUpdate' → 'prompt'`（插件不再注入 skipWaiting，产物改为监听 SKIP_WAITING 消息；显式保留 `clientsClaim: true` 确保确认激活后 controllerchange 链路生效）+ main.ts `onNeedRefresh` 改弹确认框（`@/utils/feedback` ElMessageBox + 新双语 key `feedback.newVersionReady/newVersionMessage`），用户确认后才 `messageSkipWaiting` 激活；60s 轮询与 controllerchange reload 保留。已知取舍：另一标签页确认后本页仍会因 controllerchange 自动刷新（跨标签无确认机制，记 Info）。main.test.ts 适配（mock `utils/feedback`、registerSW 返回可断言的 update mock、i18n stub 补 `global.t`）+ 新增 2 用例（确认后才激活 / 取消不激活）；build 产物核验 dist/sw.js 无顶层 skipWaiting。

**验证**：typecheck（web+server）、lint:check、test:fast（198 文件 **1113** 测试过 = 1112 −4 getOrSet 死用例 +3 C1 +2 C4）、integration + smoke 手动跑（19 过）、audit:prod = 0、versions:check、extension:sync-common:check、openapi:types:check、build（含 dist/sw.js 产物核验）全绿。

## 第 34 轮（基线 `6e0b445`，主会话修复：三路盲审 2M + 10L + 1Info 收口）

Pi / Kimi / DeepSeek 三路盲审发现 2M+10L+1Info，主会话合并去重后按 G1–G7 分组直接修复，7 个提交（`33e2901`/`683fb1d`/`18f8836`/`7e3e50c`/`0e5f267`/`8ed3f34`/`15c3af1`），全部本地提交未推送。

- **G1 文案/清空**
  - **M1（SW 新版本文案失真）**：`src/web/locales/zh-CN.json:441` / `en-US.json:441` 的 `feedback.newVersionMessage` 原称"未保存的输入不会被丢失"，与动作相反（确认即 `updateServiceWorker(true)` → controllerchange → 整页 reload）。改为如实文案（zh"检测到网站新版本，点击"立即刷新"将重新加载页面——若正在编辑，请先保存当前内容。"，en 对应），新增 `feedback.refreshNow`（"立即刷新"/"Refresh now"），`src/web/main.ts:82` `confirmButtonText` 改引 refreshNow（`feedback.confirm` 仍被 dialog.ts 使用，未动）。main.test.ts 断言同步为 `feedback.refreshNow`。
  - **L1（登录表单残留）**：`src/web/components/admin/LoginDialog.vue:222-226` 登录成功分支补 `loginForm.password = ''`（username 保留）。LoginDialog.test.ts 新增用例"clears the password…keeps the username"；既有"drops external…redirect"用例第二次提交需按清空后的真实交互重填密码。
- **G2 后端口径（服务端小改 + 单测）**
  - **L6（move/batchMove 目标分类不存在落 500）**：`src/server/services/bookmark/bookmarkWriteService.ts` 新增 `assertTargetCategoryExists`（文件头 22-33 行），`move`（:180）与 `batchMove`（:260）在写前校验 `targetCategoryId>0` 且分类存在，不存在抛 `errors.badRequest('分类不存在')`——与 addBookmark/updateBookmark 同口径，不再把 FK 原始 SQLITE 错误当 500；未分类（0/NULL）豁免。writeService 单测新增 2 用例（不存在目标分类 move/batchMove 抛 ApiError 400 且零写入、合法分类/未分类仍可移）。
  - **L7（bulk schema id 缺 .integer()）**：`src/server/validation.ts` `itemSchema.id`/`categorySchema.id` 补 `.integer()`，`itemSchema.categoryId` 补 `.integer().min(0)`——非整数 categoryId 此前会被 `normalizeDbCategoryId` 静默归入未分类，现与增量写路径（bookmarkCreateSchema）对齐。validation.test.js 新增用例：非整数 id/categoryId、负 categoryId、超出 `Number.MAX_SAFE_INTEGER` 的 id 全部被拒，合法整数通过。
- **G3 错误态（前端）**
  - **M2（SessionManager / AuditLog 加载失败被当无数据）**：两组件此前失败只弹瞬态 toast，UI 落 `common.noData` 空态且 SessionManager 无重试入口。仿照 `Site.vue:27-35` error-state + retry 模式：`SessionManager.vue:14-19,75-90`、`AuditLog.vue:32-37,122-140` 新增 `loadError` 状态位、`sn-error-state`（role=status）渲染 `common.loadFailed` + `common.retry` 按钮（AuditLog 复用顶部手动刷新同一 `fetchLogs` 链路），成功/开始重试时清位。两个组件测试改为断言错误态可见 + 重试后恢复。
- **G4 a11y**
  - **L2（自绘弹窗无可访问名）**：`src/web/utils/feedback/dialog.ts:79-118` 新增稳定 id（模块级 `dialogInstanceCounter`，`sn-feedback-dialog-title-N`/`message-N`）并挂 `aria-labelledby`/`aria-describedby`（消息为空时不挂 describedby）。feedbackCore.test.ts confirm 用例加属性断言。
  - **L3（AppSelect 键盘死角）**：选项菜单 Teleport 到 body 后，若选项可被 Tab 聚焦，方向键/Esc 的 keydown 只绑 combobox root 会失效。选方案一（纯 aria-activedescendant）：`src/web/components/AppSelect.vue:36` 选项 button 加 `tabindex="-1"` 并把键盘焦点恒留在 combobox；注释说明为何不选"menu 上补同款 keydown"（双处理路径复杂且易重入）。AppSelect.test 新增"keeps menu options out of the tab sequence"。
  - **L4（右键菜单）**：三件事（a）焦点归还——`src/web/composables/useSiteMenu.ts` 关闭逻辑记录触发元素并按"键盘打开的任何路径 / 关闭时焦点仍在菜单内（Esc/选择）"归还，外部指针点击已把焦点移到其他可聚焦元素时不抢回；（b）键盘入口——新 `src/web/utils/events.ts` 导出 `isContextMenuKey`（ContextMenu 键 / Shift+F10），SiteCard 卡片链接、SiteCategory 分类标题（新增 `tabindex="0"` + `:focus-visible`）与子分类 tab 的 keydown 走既有 contextmenu 事件流上抛，composable 按事件类型定位（键盘事件无 clientX/Y，取触发元素 rect）；（c）`SiteContextMenu.vue` role=menu 补本地化 `aria-label`（新增 `context.itemMenuLabel`/`categoryMenuLabel`）。SiteCard/SiteCategory/SiteContextMenu/useSiteMenu 四组测试补齐（键盘打开、Shift+F10、菜单 aria-label、焦点归还/不抢回）。
- **G5 防御/UX 守卫**
  - **L5（bootstrap localStorage 无守卫）**：`src/web/plugins/i18n.ts:6,36`、`src/web/utils/theme.ts:39-76`、`src/web/store/config.ts:62-83`、`src/web/main.ts:103` 的 getItem/setItem/removeItem 全部包 try/catch 降级默认值/静默（主题读写 helper `readStoredThemeMode`/`writeStoredThemeMode` 统一承载，storage 参数保持测试注入语义）。theme.test 新增"degrades gracefully when localStorage access is blocked"。
  - **L8（controllerchange 首访多余 reload）**：`src/web/main.ts:50-72` 注册时快照 `navigator.serviceWorker.controller`——无 controller（首访）跳过首个 controllerchange（clientsClaim 首次接管），其后任何 controllerchange 照常 reload；有 controller（已受控页）首个即 reload。main.test.ts 原用例改为带 controller 快照断言 reload，新增"首次 claim 跳过、后续替换 reload"用例。
- **G6 Docker 一致性**
  - **L9（runtime-min 缺 NPM_REGISTRY 透传）**：`docker/Dockerfile.runtime-min` 顶层与 build/prod-deps 两阶段补 `ARG NPM_REGISTRY`，两处 `npm ci` 追加 `--registry "${NPM_REGISTRY:-https://registry.npmjs.org/}"`，与主 `docker/Dockerfile:21,44` 对齐。
  - **L11（HEALTHCHECK 以 root 探活）**：选保守方案 B——两个 Dockerfile 的 HEALTHCHECK 旁注释说明"HEALTHCHECK 无 --user 选项，探活有意以容器默认 root 执行，仅访问 localhost GET /api/health 无写入面；不引入多层 USER 指令（会复杂化 entrypoint 降权/数据目录权限链路）"。理由已写进注释。
- **G7 交付维护**
  - **L10（globIgnores 硬编码漂移）**：`vite.config.ts:39-56` 改从单一常量 `ADMIN_LAZY_CHUNK_PREFIXES` 派生（flatMap 出 js/css 两段 glob），注释写明命名来源（router 懒加载视图 + useAdminDashboardViews 的 defineAsyncComponent）与取舍——选择"常量收敛 + 注释互引"而非构建期断言（5 个名字的断言复杂度高于收益；漂移形态是 glob 死条目/漏配，不破坏构建）。`npm run build` 验证：5 个 chunk 前缀在 dist/assets 全部存在、dist/sw.js 预缓存清单零命中。
  - **Info（feedback.ts prompt 死面）**：`src/web/utils/feedback.ts:30` `ElMessageBox.prompt` 全库零调用 → **删除**（删除面小且安全）。连带删除 dialog.ts prompt 分支/输入框逻辑、types.ts DialogKind/输入选项字段、dom.ts `.sn-feedback-dialog-input` 样式、feedback-core/feedback 的 prompt 方法与转发；两处测试移除 prompt 流程。决策理由：删除面集中在 feedback 私有子模块，约 60 行 + 样式，无生产引用面。
- **验证**：typecheck（web+server）、lint:check、test:fast（198 文件 **1126** 测试过）、integration + smoke 手动跑（19 过）、build（dist 产物核验：5 个管理 chunk 不进 SW 预缓存）全绿。未改 package.json → audit/versions/extension-sync/openapi 面未触发。

## 第 35 轮（基线 `e7188b0`，四路盲审 0H/2M/13L 收口）

Pi / Kimi / CodeBuddy / DeepSeek 四路盲审合计 **0 H / 2 M / 13 L**，主会话按 G1–G5 分组直接修复，5 个修复提交（`fb98f8f`/`0365c3c`/`16c343c`/`98465e8`/`5b22e02`）+ 本台账提交，全部本地未推送。

- **G1 存储守卫补漏（M1，CodeBuddy）**
  - `src/web/utils/authStorage.ts:31,39` `write()`/`clear()` 裸调 `localStorage.setItem/removeItem`（`read()` 已有 try/catch）——34 轮 L5 同族漏网。存储被禁（隐私模式/禁用站点数据）时登录成功路径抛 SecurityError（LoginDialog 报登录失败但服务端 cookie 已建）、401 清态中断。改 try/catch 降级（写失败静默、清失败静默）。
  - `src/web/components/index/searchUtils.ts:65-86` 新增 `safeStorageGet/Set/Remove` 三个 helper；`:170-228` 的 `loadSearchEngineState`/`persistSearchEngines`/`persistCurrentEngine` 全部改走 helper，读回退默认引擎、写静默——此前无守卫，setup 期可致首页搜索组件挂载失败。
  - 测试：新增 `tests/web/utils/authStorage.test.ts`（3 例：往返 / 损坏 payload / 存储被禁降级）；`tests/web/components/searchUtils.test.ts` 新增 "degrades to defaults when storage access is blocked"。LoginDialog.test（11 例）无回归。
- **G2 错误态补漏（M2，CodeBuddy）**
  - `src/web/composables/admin/useUserManagement.ts:19-37` 新增 `usersLoadError`；`src/web/components/admin/UserTable.vue:12-21` 渲染 `sn-error-state`（role=status）+ `common.retry` 按钮并 emit `retry`；`src/web/composables/admin/useAdminDashboardViews.ts:106-120` 透传 `loadError` prop 与 retry 事件；`src/web/views/AdminDashboard.vue` 接线（与 34 轮 G3 修的 SessionManager/AuditLog 同型漏网）。
  - `src/web/composables/admin/useSystemSettings.ts:19-32` + `src/web/components/admin/SystemSettings.vue:3-9` 同模式补 `settingsLoadError`——失败不再落空表单（保存会被服务端 `adminSettingsSchema.min(1)` 400 拦，无数据丢失）。
  - 取舍：动作成功后的列表刷新失败走 `fetchUserList({ silent: true })`，抑制 toast 但置错误态（保持第 30 轮 M2 的"不矛盾双 toast"语义）。
  - 测试：UserTable / useUserManagement / useSystemSettings / SystemSettings / useAdminDashboardViews 各补用例（含"刷新失败 silent 但仍置错误态"）。
- **G3 后端校验/DoS 强化（Kimi）**
  - `src/server/validation.ts:106,124` bulk `itemSchema.id`/`categorySchema.id` 由 `.integer()` → `.integer().positive()`（拒绝 0/负数，消除与前端虚拟"未分类" id=0 撞 id 与 batchDelete/Move 的 `.positive()` 口径不一致；导出 id 恒为自增 ≥1，导入回归不受影响）。
  - `src/server/validation.ts:135-136` bulk categories/items 数组补 `.max(5000)` / `.max(20000)`（express.json 10mb 只兜字节量，不挡数组长度；超限落 400）。
  - `src/server/services/bookmark/categoryWriteService.ts:82-101` `assertNoCategoryCycle` 补全局 `visited`，防深链从每个入口重复遍历（O(n²)）；链深已由数组 max 限住。
  - `server.ts:141-145,251` 新增 `noStoreApiResponses`（仅挂 `/api`）统一 `Cache-Control: no-store`；dist 指纹资源 / uploads 静态缓存头不变。
  - 测试：`tests/server/validation.test.js` 补 0/负 id 拒绝 + 超限 400；`tests/server/services/categoryWriteService.test.js` 补 5000 深链导入；`tests/server/server.test.js` 补 no-store + 静态头不变（并修正原 `/api` 404 handler 查找，避免命中新中间件）。
- **G4 a11y + 死码（CodeBuddy）**
  - `src/web/components/index/SiteCategory.vue:11-19` 分类标题由无 href 的 `<a tabindex="0">` → 真 `<button type="button">`，鼠标点击（`openCategoryMenuFromPointer`，带坐标）/ Enter·Space（`openCategoryMenuFromKeyboard`，走 KeyboardEvent 取元素 rect）打开分类菜单；`:153-175` 删死 emit `header-click`/`add-item` 与死 prop `showAdd`；`src/web/components/index/Site.vue:60-75` 同步删 `@add-item`/`:show-add`。
  - `src/web/components/admin/SystemSettingsAssets.vue:45-66` 预览图 `alt="Logo Preview"`/`alt="Favicon Preview"` → `alt=""`（相邻 `asset-preview-label` 已命名资产，图像纯装饰；消除硬编码英文）。
  - `clients/extension/popup/popup.html:95,135-140` `#cancelAdd`/`#closeCategoryModal` 补可访问名（新增 `close` 双语文案 key，`ui.js` 随语言刷新 title+aria-label）；`#categoryModal` 补 `role="dialog"`/`aria-modal="true"`/`aria-labelledby`。
  - `src/web/components/AppSelect.vue:39-60` 选项按钮补 `@mousedown.prevent`：阻止鼠标/触控按下把焦点移到选项（选中后菜单卸载焦点落 body），焦点恒留 combobox root；注释同步（第 34 轮 L3 纯 aria-activedescendant 模式的收口）。
  - 测试：SiteCategory（button 语义 + Enter/Space/click 打开菜单）、Site（stub emits 清理）、AppSelect（mousedown preventDefault + 选中关闭）同步。
- **G5 运维/文档一致性（DeepSeek）**
  - `scripts/docker/compose-deploy-common.sh:147-211` backup/restore 由宿主机 `npm run db:backup/restore` 改为容器内执行：backup 走 `docker exec`（容器运行中）；restore 因容器已 stop 改用一次性 `docker run --rm -v ${HOST_DATA_DIR}:/app/data` 复用镜像 node_modules；新增 `to_container_path`/`container_running`/`resolve_tool_image`。容器未运行时备份跳过并打印明确提示（首次部署无旧数据可保护）。
  - `scripts/docker/run-manual-demo.sh:100` docker run 补 `-e "TRUST_PROXY=${TRUST_PROXY:-false}"`，与 compose（第 29 轮 M1 口径）对齐。
  - `docs/OPERATIONS.md:29` 补说明：compose 主入口默认 `TRUST_PROXY=false`（直连），有受信反代需显式 true（消除与 compose 相反的误导）；`:263` 示例 `STARNAV_TAG=2.2.8` → `<release-version>`（与 RELEASE.md §4 对齐）；部署步骤补容器内备份说明。
  - `.github/workflows/docker-publish.yml:28` 删除无 sigstore/cosign 消费方的 `id-token: write`（保留 contents: read + packages: write）。
- **Info 记录（不改码）**
  - `scripts/docker/run-manual-demo.sh:11` `random_hex` 的 openssl 非零退出会绕友好报错（`set -e` 直接中止，可接受）。
  - `src/server/services/bookmark/bookmarkMutationService.ts:81-85` 备份节流跳过与真失败共用同一拒绝文案（fail-closed 方向安全）。
  - `src/server/services/bookmark/bookmarkWriteService.ts:200` move 先查分类后查条目 → "不存在书签+不存在分类"返 400 而非 404（语义边角）。
  - `tests/server/middleware/limiter.test.js` 内省 `loginLimiter.options` 非公开 API（脆性而非假绿）。
- **验证**：typecheck（web+server）、lint:check、test:fast（**199 文件 / 1142 测试**过；基线 198/1126 + 本轮新增 16 例）、integration + smoke 手动跑（19 过）、`extension:sync-common:check`（in sync）、`npm run build`（产物核验）全绿。未改依赖/版本/`src/shared` → audit:prod / versions:check / openapi:types:check 面未触发。

## 已知遗留 / 有意保留

1. **超大组件拆分**——**已完成**（`f2a4c6a`）：SystemSettings 750→222、DataManager 655→153、BookmarkImport 605→319，各拆 3 个子组件（Account/Site/Assets、Toolbar/CategoryPanel/ItemsPanel、StepUpload/Preview/Result），纯 props/emits 拆分、行为不变。
2. **PV/UV 统计**——**已删除**（`5778a77`）：`POST /visit` 路由、全局 `statsLogger` 中间件、`daily_stats`/`visit_logs` 表定义与写入、`ua-parser-js` 依赖及相关测试/文档全部移除，schemas 不再创建旧表；已有库中的旧表保留不动、不再写入。

> **所有历史遗留项已清零**。后续审查视角可回到全库新维度（如前端 UX/可访问性、扩展权限最小化深挖、构建产物优化等）。

## 安全基线更新（2026-10-22）

- **Node.js 2026-10-21 安全发布**（修复版 26.12.1 / 24.22.1 / 22.23.4；4 高危：Brotli 解码越界写 CVE-2026-111497、TLS 主机名校验绕过 CVE-2026-105483 / CVE-2026-106069、dns.resolve NUL 截断 CVE-2026-105482）。
- 交付基线 `node:24.14.1-slim` → **`node:24.22.1-slim`**：`docker/Dockerfile`、`docker/Dockerfile.runtime-min` 的 `ARG NODE_IMAGE`、`scripts/docker/docker-build-local.sh` / `docker-smoke.sh` 默认值、`docs/DEVELOPMENT.md` / `docs/RELEASE.md` 同步。
- 验证（WSL Docker 29.6.1）：`NODE_IMAGE=node:24.22.1-slim sh scripts/docker/docker-smoke.sh` 通过；镜像内 `node -v` = **v24.22.1**；health/login 冒烟通过。
- 范围：仅 StarNav 自建镜像；同主机其余第三方镜像需等上游重建。已部署实例需用新镜像重新部署/重启后生效。
- 残余暴露：Brotli RCE 需应用主动解压攻击者可控数据（本项目只做响应压缩，不解压请求体）；TLS 绕过针对出站校验（link-check/favicon/搜索建议），需攻击者已在中间人位置。

## 多 agent 委托运维笔记（重要，防止下轮踩坑）

- **@Pi**：可靠，直接读文件跑完，可委托完整审查。
- **@Kimi Code**：**禁止其派生子代理**（Explore/AgentSwarm 会卡死在 `Wait for agent`）——任务里必须显式写"HARD CONSTRAINTS: DO NOT spawn any sub-agents"，并要求"优先写报告"。
- **@DeepSeek**：部署 API 慢，且 codeg-mcp 会话经常中途被取消（"child session ended without TurnComplete"）——**不要提前取消**，给足耐心；若连续两次被取消，直接跳过改由其他 agent 覆盖，不要再重试。**第 5 轮新经验**：默认全库任务它会无限深挖不产出（等了 70+ 分钟仍无报告）；改用聚焦版 prompt——**明确写死项目目录绝对路径 + "BE SURGICAL：只读 4-6 个关键文件 + grep 验证，3-8 条，先写报告"**——约 27 分钟正常完成。以后 DeepSeek 一律用聚焦版。
- **@CodeBuddy**：可靠（第 4 轮新加入，完整交付）。**第 6 轮新经验**：大修复任务（15 项 + 全量回归）会跑约 3-4 小时（其中 lint:check 阶段单次调用极慢，需耐心等待），过程细致（会自查 diff、补测试、跑 integration/smoke），不要提前取消。
- **修复工作流（自第 19 轮起）**：审查完的修复项由主会话用 `delegate_to_agent(agent_type=code_buddy)` 起**独立子对话**执行（不再主会话内逐项修），prompt 给全 A/B/C 分档清单 + file:line + 约束 + 验证门槛；子对话完成后主会话抽查关键 diff 与定向测试（trust but verify）。第 19 轮 A+B 共 8 项一次子对话完成，质量高。
- 独立全库审查 vs 切片：用户偏好**三个以上 agent 各自独立全库审查**（不切片），每个 agent 给同一基线提交 + 已知遗留清单，要求只报新增、台账格式输出、read-only。
- 修复后：全量回归（typecheck + lint + test:fast + 各 drift check）；用户要求**本地提交**（不推送）。

## 下一轮建议视角（前四轮已覆盖）

安全/正确性 → i18n → 整洁度/科学度 → 幸存者扫描。后续可考虑：**架构级**（分层/耦合/演进）、**运维硬化**（部署/降级/容错演练）、或**遗留项专项**（组件拆分）。
