# 审查清单（Review Checklist）

> 目的：把"完整审查"从**碰运气读代码**变成**可衡量、可追踪、可复用**的过程。
> 清单是地板不是天花板——维度固定，但清单之外的新问题照报不误。

## 工作流

```
1. 定切片 → 2. 每个切片跑清单 → 3. 交叉抽查 → 4. 台账标记 → 5. 修复+回归 → 6. 下一轮增量
```

1. **定切片**：按目录或功能域把仓库切成 N 块，每块一个审查者。
2. **跑清单**：审查者在自己的切片上逐项过下面的维度表，输出 `file:line` 证据。
3. **交叉抽查**：每个审查者抽查相邻切片的 ≥3 个清单项，抵消视角单一。
4. **台账**：已覆盖文件 / 已报问题写入台账，标注状态（open / fixed / wontfix）。
5. **修复 + 回归**：全量修复后跑 `npm run typecheck` + `npm run lint:check` + `npm run test:fast`。
6. **下一轮增量**：台账中已覆盖的切片跳过，只查变更部分 + 上次未覆盖文件。

## 仓库切片（StarNav 默认）

| 切片       | 范围                                                                               | 默认视角                         |
| ---------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| 后端运行时 | `server.ts`、`src/server/**`（routes/controllers/services/middleware/utils/tools） | 安全 / 正确性 / 资源 / 运维      |
| 前端 SPA   | `src/web/**`（components/composables/store/api/router/config/utils/views）         | 状态 / UX / 安全 sink / 死代码   |
| 共享契约   | `src/shared/**`、`src/server/types/**`                                             | 前后端一致性 / 校验 / 逃逸       |
| 扩展客户端 | `clients/extension/**`                                                             | 权限最小化 / 凭证存储 / 生命周期 |
| 构建与交付 | `vite.config.ts`、`docker/**`、`scripts/**`、`.github/**`、`package.json`          | 构建产物 / 镜像 / CI / 依赖      |
| 文档与配置 | `docs/**`、`README.md`、`.env.example`、`config/**`、`.husky/**`                   | 与代码事实是否一致               |

## 维度清单

### A. 安全（后端优先）

- [ ] 鉴权：Bearer/Cookie 回退顺序、`requireAdmin` 覆盖所有管理路由、水平/垂直越权
- [ ] 会话：token 失效（改密/改名/删号）、会话撤销、Cookie 属性（Secure/SameSite/HttpOnly）
- [ ] 限流：登录/注册/写操作/公开点击接口是否有桶，是否存在轮换 key 绕过
- [ ] SSRF：外呼目标（link-check / favicon 代理 / 搜索建议）是否校验协议+私网 IP+固定解析
- [ ] 注入：SQL 全部参数绑定、动态 SQL 是否白名单、命令执行面
- [ ] 路径与文件：上传类型/签名/尺寸校验、路径穿越、`dbPath` 等本地路径是否泄露到公开响应
- [ ] 敏感信息：日志/响应/健康检查不泄露密钥、路径、异常栈；默认凭据与密钥轮换
- [ ] 前端 sink：`v-html` 是否过净化器、`href`/`window.open` 是否限 http(s)+相对路径、open redirect
- [ ] CSRF：Cookie 写请求的 Origin/Referer 校验与 `CORS_ORIGINS` 白名单行为

### B. 正确性 / 并发（前后端通用）

- [ ] 竞态：并发 API 请求、乐观更新是否回滚、缓存失效是否成对
- [ ] 错误处理：吞错 / 泄露内部细节 / unhandled rejection / 超时兜底
- [ ] 时间与时区：UTC 存储 vs 展示时区、cron 时区、日期边界
- [ ] 分页/边界：off-by-one、空列表、超长输入、0/负数参数
- [ ] 状态重置：筛选/分页/选中在数据变化时是否该重置

### C. 资源与运维（后端优先）

- [ ] 资源释放：DB 连接、定时器、rAF、事件监听、Observer 在卸载/停机时清理
- [ ] 优雅停机：SIGTERM/SIGINT → close → checkpoint → closeDb
- [ ] 备份/恢复：一致性（非撕裂）、保留轮换、恢复前快照
- [ ] 内存/磁盘：缓存上限、日志/统计表保留策略、第三方响应大小上限
- [ ] 启动失败：端口占用、配置错误、依赖缺失是否有明确报错

### D. 前端状态 / UX

- [ ] Pinia 状态：陈旧状态、未重置错误、store 与 localStorage 同步
- [ ] 弹窗/对话框：打开关闭、焦点管理、Esc 行为、多次提交防护
- [ ] 表单校验：必填、URL 归一化、失败提示与回滚
- [ ] 加载/空/错误三态齐全
- [ ] 可访问性：键盘可达、aria 标注、对比度（影响用户的项）

### E. 死代码 / 质量

- [ ] 未被引用的文件/导出/字段/处理器
- [ ] 重复逻辑（应提取共享工具）
- [ ] 超大组件/函数（>600 行）是否值得拆分
- [ ] 未使用 import、魔法字符串重复

### F. 构建 / 交付 / 文档一致性

- [ ] `vite.config.ts`：manifest 图标、SW 缓存策略（拦截面是否过大）、压缩、分包
- [ ] `package.json`：scripts 与文档一致、依赖安全（`npm run audit:prod`）
- [ ] Docker：镜像层、非 root、数据卷权限、entrypoint、healthcheck
- [ ] CI：`ci.yml` 门禁是否覆盖 typecheck/lint/audit/coverage/build/smoke
- [ ] 文档 vs 代码：`API.md` 路由表、`ARCHITECTURE.md` 分层、端口/路径引用是否与实现一致
- [ ] 版本：`package.json` 与 manifest/README 的版本字符串是否同步（`npm run versions:check`）

## 台账模板

每个切片一张表：

| 文件 / 位置                              | 问题               | 维度   | 严重级 | 状态  | 备注                |
| ---------------------------------------- | ------------------ | ------ | ------ | ----- | ------------------- |
| `src/server/middleware/limiter.ts:14-33` | 登录无纯 IP 兜底桶 | A-限流 | High   | fixed | 新增 loginIpLimiter |
| ...                                      |                    |        |        |       |                     |

状态：`open` / `fixed` / `wontfix`（wontfix 必须写原因）。

下一轮开始时：

1. 复制上轮台账，`fixed` 行移到"历史"区；
2. 对比 `git log` 的变更文件，把变更文件加入"本轮新增"切片；
3. 其余切片如无变更且上轮已覆盖，可跳过或抽样。

## 与现有工具的配合

- 切片边界以 `docs/ARCHITECTURE.md` 的分层描述为准
- 修复后的回归门槛：`npm run typecheck`、`npm run lint:check`、`npm run test:fast`（`test:fast` 在 Windows 下会顺带覆盖 extension/tools/smoke）
- 涉及构建/发布时再加 `npm run build`、`npm run docker:smoke`
