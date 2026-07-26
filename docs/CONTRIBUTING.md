# StarNav 贡献与工程治理

这份文档定义 StarNav 默认的协作入口，目标不是增加流程负担，而是减少“代码合了但契约、文档、验证漂移”的返工。

## 1. 基线

- Node.js 统一使用仓库根目录 [`.nvmrc`](../.nvmrc) 与 [`.node-version`](../.node-version) 指定的 `24.x`
- npm 基线为 `10+`
- 统一入口命令、部署流程与发布守门分别以 [`README.md`](../README.md)、[`DEVELOPMENT.md`](./DEVELOPMENT.md)、[`OPERATIONS.md`](./OPERATIONS.md)、[`RELEASE.md`](./RELEASE.md) 为准

## 2. 代码变更默认规则

- 优先做最小正确改动，不为了“顺手整理”扩大改动面
- 先看现有实现和测试，再决定是否引入新抽象
- 保持既有架构方向：`routes -> controllers -> services`，controller 尽量薄，业务编排尽量放在 service
- 保持接口契约稳定：JSON 接口默认沿用 `{ success, message, data }` / `{ success: false, error, code }`
- 不提交密钥、一次性密码、机器本地路径或其他环境特有内容
- 真实落盘测试必须使用隔离运行目录，不要把测试产物写回仓库 `data/`

## 3. 开发流程

1. 从 `main` 拉出分支
2. 在本地完成最小可审查改动
3. 按影响面补齐测试与文档
4. 运行对应验证命令
5. 用 Conventional Commits 提交
6. 提交 PR，并按模板写清验证结果、风险和文档更新

提交示例：

```bash
git commit -m "fix(auth): validate session ownership in middleware"
git commit -m "docs(release): clarify docker smoke gate"
git commit -m "refactor(bookmarks): split mutation cache invalidation"
```

## 4. 文档同步规则

以下类型的改动，默认需要同步文档，而不是只改代码：

- API 行为、字段、状态码、错误语义变更：
  更新 [`API.md`](./API.md)、Swagger 注释，以及相关前端 API helper / 测试
- 模块边界、初始化流程、缓存策略、分层职责变更：
  更新 [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- 启动、备份、恢复、升级、部署、回滚路径变更：
  更新 [`OPERATIONS.md`](./OPERATIONS.md)
- 发布流程、CI 门禁、版本编排或镜像发布链路变更：
  更新 [`RELEASE.md`](./RELEASE.md)
- 用户可见能力、验证基线、默认运维入口变更：
  更新 [`README.md`](../README.md)
- 涉及较大重构、架构演进、依赖/运行时基线调整：
  补对应 `docs/requirements/*.md` 与 `docs/plans/*.md`

## 5. 测试与验证矩阵

不要机械地每次都跑全套；按改动类型选择最小但足够的验证，并在 PR 里写明实际执行结果。

### 默认代码改动

```bash
npm run lint:check
npm run typecheck
npm run test:fast
npm run build
```

### API / OpenAPI / 扩展公共代码

```bash
npm run openapi:types:check
npm run extension:sync-common:check
```

CI `validate` job 已包含上述两项；改共享类型或 `src/shared` 时本地应先跑。

### Shell / Dockerfile / 部署脚本改动

```bash
npm run lint:ops
```

### 启动流程、认证、数据写路径、迁移、恢复、运行时行为改动

```bash
npm run test:smoke
```

### Docker 交付链路改动

```bash
npm run docker:smoke
```

### 发布流程或 CI 门禁改动

```bash
npm run release:dry-run
```

CI 仍会继续执行 coverage、runtime smoke 和 Docker smoke；本地验证的目标是尽早发现回归，而不是把问题留到合并后。

## 6. 测试放置规则

- 后端 service/controller/middleware/utils 变更：优先补到 `tests/server/...`
- 前端组件、composable、store、api 变更：优先补到 `tests/web/...`
- 浏览器扩展变更：优先补到 `tests/extension/...`
- 共享工具变更：补到 `tests/shared/...`
- 需要覆盖端到端运行时语义时：补或更新 `tests/smoke/...`

如果是 contract 修复，测试应和 contract 同步提交，不接受“代码先改，测试下次补”。

## 7. PR 审查预期

每个 PR 默认应回答清楚这几件事：

- 为什么要改
- 改了什么
- 影响了哪些模块或接口
- 跑了哪些验证，结果如何
- 哪些文档已经同步
- 是否存在发布、迁移、数据、权限或回滚风险

仓库已提供 [`.github/pull_request_template.md`](../.github/pull_request_template.md) 作为默认输入模板。

## 8. Issue 与 Ownership

- GitHub issue 入口现在通过 `.github/ISSUE_TEMPLATE/` 收口为 `Bug report`、`Feature request`、`Governance task` 三类
- 安全问题不要走公开 issue，统一使用仓库 Security Advisory 入口
- [`.github/CODEOWNERS`](../.github/CODEOWNERS) 当前先保持单一维护者 ownership，后续有稳定模块 owner 再细分
- `npm run github:protect:main` 会用 `gh` 为 `main` 配置保护规则；默认要求 PR、`validate` 检查、对话已解决和线性历史，但审批数默认是 `0`，避免单维护者流程被锁死

## 9. 相关入口

- 项目总览与验证基线：[README.md](../README.md)
- 本地开发与工具链：[DEVELOPMENT.md](./DEVELOPMENT.md)
- 运维动作：[OPERATIONS.md](./OPERATIONS.md)
- 发布与 CI：[RELEASE.md](./RELEASE.md)
- 仓库协作约束：[AGENTS.md](../AGENTS.md)
