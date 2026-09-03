# 审查台账（Review Ledger）

> 目的：记录多轮全库审查的发现、修复与遗留项，供下一轮无缝衔接。
> 流程与维度定义见 [REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md)。
> 基线版本 **1.0.7**（`package.json` 为准）。17 轮全库审查 → v1.0.7 release（`150e19a`）已发布，后续运维提交（HEALTHCHECK CI 修复、`REAL_CLIENT_IP_HEADER`、Cloudflare 真实 IP 自动检测）直接推 main。origin/main = `71eea62`。

## 当前状态

| 提交      | 内容                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------- |
| `7f365c1` | 第 1 轮审查修复（全库安全/正确性 + 构建层）                                                               |
| `498c4fa` | 新增 `docs/REVIEW_CHECKLIST.md`                                                                           |
| `20df7da` | 第 2 轮修复（安全/i18n/健壮性，18 项）                                                                    |
| `f757918` | 第 3 轮修复（整洁度/科学度，22 项）                                                                       |
| `3db9784` | 第 4 轮修复（幸存者扫描，20 项）                                                                          |
| `fcf54e5` | 测试性能：纯 Node 测试改走 node 环境（墙钟 -40%）                                                         |
| `a712108` | 第 5 轮修复（架构级/运维硬化，17 项）                                                                     |
| `9ac2467` | 第 6 轮修复（变更回归/测试质量，15 项）                                                                   |
| `5778a77` | 删除 PV/UV 采集（统计面板已下线）                                                                         |
| `f2a4c6a` | 组件拆分专项（3 大组件 → 9 子组件）                                                                       |
| `fa0f4fc` | 第 7 轮修复（死 key/类型/文档清理，12 项）                                                                |
| `3385eb1` | 第 8 轮修复（UX/可访问性/扩展/构建，30 项）                                                               |
| `864e9eb` | TRUST_PROXY 默认开启（信任一层反代）                                                                      |
| `c33d505` | 第 9 轮修复（TRUST_PROXY 告警/a11y 测试，15 项）                                                          |
| `5b99dbb` | 第 10 轮修复（数据层/性能/API 契约，18 项）                                                               |
| `dff7b94` | 第 11 轮修复（前端运行时/安全纵深/测试，17 项）                                                           |
| `cfdff50` | 第 12 轮修复（扩展生命周期/图标/主题，20 项）                                                             |
| `582efed` | 第 13 轮修复（i18n parity/配置文档/集成，15 项）                                                          |
| `017d11a` | 第 14 轮修复（可访问性/移动端/性能，25 项）                                                               |
| `892a06e` | 第 15 轮修复（错误纵深/迁移完整性，14 项）                                                                |
| `3fd3c21` | 第 16 轮修复（供应链/API docs 暴露，19 项）                                                               |
| `f2cb153` | 第 17 轮收口修复（发布就绪，7 项）                                                                        |
| `150e19a` | **v1.0.7 release**（squash 40 提交为单 release 提交，371 文件）                                           |
| `1c3dd34` | release 后运维：HEALTHCHECK CMD 改 JSON 数组（CI hadolint DL3025 修复）                                   |
| `371fcea` | release 后运维：`REAL_CLIENT_IP_HEADER`（CDN 专用客户端 IP 头支持）                                       |
| `71eea62` | release 后运维：Cloudflare 真实 IP 自动检测（socket 对端 ∈ CF 官方网段才采信 `CF-Connecting-IP`，零配置） |
| `7725ebe` | 第 18 轮修复（CF IP 链路专项：req.ip 赋值 500 High + 解析收紧 + 文档精确性）                              |
| `7f4e527` | 第 19 轮修复（A+B：真机 IP 覆盖 smoke 用例、死代码/死 key/死导出清理、limiter 测试保真度）                |
| `dd45d41` | 第 20 轮修复（A+B：SSRF mapped v6 封锁、dummy hash cost12、契约死类型/死 UI 行、写路径错误文案等 12 项）  |
| `9751566` | 第 21 轮修复（A+B：SSRF compat/NAT64/6to4 封锁、SW denylist、错误文案统一等 15 项 + 历轮排除复核落地）    |
| `df4c7a3` | 第 22 轮修复（A+B：login catch 收口、local-use NAT64 封锁、AppSelect a11y 名、排序决胜键等 7 项）         |
| 未提交    | 第 23 轮修复（A+B：qs 6.16.0、NAT64 local-use /48 整块封锁、扩展 E2E 重写、网络错误文案收口等 10 项）     |

验证门槛：`npm run typecheck`、`npm run lint:check`、`npm run test:fast`、`npm run versions:check`、`npm run extension:sync-common:check`、`npm run openapi:types:check`、`npm run build`。`test:fast` 现为 **197 文件 / 1089 测试**（会排除 `tests/integration/**` 与 `tests/smoke/runtime.smoke.test.js`，另手动跑 = integration + smoke 16）。

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
- 遗留：`MaxIdRow` 类型导出（categoryWriteService 移除使用后成死类型，删需动 domain.ts 类型组，超范围未动）

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

## 已知遗留 / 有意保留

1. **超大组件拆分**——**已完成**（`f2a4c6a`）：SystemSettings 750→222、DataManager 655→153、BookmarkImport 605→319，各拆 3 个子组件（Account/Site/Assets、Toolbar/CategoryPanel/ItemsPanel、StepUpload/Preview/Result），纯 props/emits 拆分、行为不变。
2. **PV/UV 统计**——**已删除**（`5778a77`）：`POST /visit` 路由、全局 `statsLogger` 中间件、`daily_stats`/`visit_logs` 表定义与写入、`ua-parser-js` 依赖及相关测试/文档全部移除，schemas 不再创建旧表；已有库中的旧表保留不动、不再写入。

> **所有历史遗留项已清零**。后续审查视角可回到全库新维度（如前端 UX/可访问性、扩展权限最小化深挖、构建产物优化等）。

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
