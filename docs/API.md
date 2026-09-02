# StarNav API

StarNav 当前后端统一挂载在同一个 Node 进程下，HTTP API 的统一前缀是 `/api`。

## Base URL

```text
Local standalone runtime: http://localhost:8080/api
Development: http://localhost:3333/api
Production:  https://your-domain.com/api
```

## Response conventions

当前 JSON 接口默认返回统一 envelope：

- 成功：`{ success: true, message, data }`
- 失败：`{ success: false, error, code, details? }`

例外只有显式的二进制或纯文本响应。历史客户端兼容逻辑仍然保留在前端和扩展的 API helper 中，但新代码应直接消费 `data`。

## Authentication

受保护接口同时支持两种鉴权方式：

```http
Authorization: Bearer <jwt>
```

- Web 管理端登录成功后，服务端会下发 HttpOnly Cookie `starnav_auth`；浏览器 Web 页面请求（http/https `Origin`/`Referer`）的响应体**不含** `token`
- 浏览器扩展（`chrome-extension://` 等）与 CLI/脚本等无 `Origin` 的客户端作为独立客户端，直接走 `/login`，响应体**含** `token` 并持久化供 Bearer 使用
- 后端认证优先读取 Bearer Token，其次回退到 Cookie
- Cookie 鉴权的写请求会校验 `Origin` / `Referer`，拒绝不受信来源
- JWT 会绑定当前用户的认证版本；用户改密、改名、改权限或被删除后，旧 token 会失效
- 上传图片会同时校验文件大小、真实签名和尺寸，当前上限为 5MB、最长边 4096px

登录接口：

```http
POST /api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

典型返回（浏览器扩展 / CLI 等无 `Origin` 客户端，响应体**含** `token`）：

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "login": "admin",
      "name": "admin",
      "level": 3
    },
    "sessionId": "session_xxx"
  }
}
```

浏览器 Web 页面请求（http/https `Origin`/`Referer`）返回的 `data` 中**不含** `token`，仅 `user`、`sessionId` 与 `expiresInDays`；认证态由 HttpOnly Cookie `starnav_auth` 承载。

## Route map

### Public and auth

| Method   | Path                      | Auth | Notes                  |
| -------- | ------------------------- | ---- | ---------------------- |
| `POST`   | `/login`                  | No   | 登录                   |
| `POST`   | `/logout`                 | Yes  | 登出并撤销当前会话     |
| `POST`   | `/register`               | No   | 是否开放由系统设置控制 |
| `GET`    | `/sessions`               | Yes  | 获取当前用户会话       |
| `POST`   | `/sessions/revoke-others` | Yes  | 撤销其他会话           |
| `DELETE` | `/sessions/:sessionId`    | Yes  | 撤销指定会话           |

### Admin

| Method   | Path                     | Auth  | Notes                  |
| -------- | ------------------------ | ----- | ---------------------- |
| `GET`    | `/admin/users`           | Admin | 用户列表               |
| `POST`   | `/admin/users`           | Admin | 创建用户               |
| `PATCH`  | `/admin/users/:username` | Admin | 更新用户名、密码或权限 |
| `DELETE` | `/admin/users/:username` | Admin | 删除用户               |
| `GET`    | `/admin/audit`           | Admin | 审计日志               |
| `DELETE` | `/admin/audit`           | Admin | 清空审计日志           |
| `GET`    | `/admin/settings`        | Admin | 后台系统设置           |
| `POST`   | `/admin/settings`        | Admin | 更新后台系统设置       |

### Content and bookmarks

| Method   | Path                     | Auth     | Notes                                     |
| -------- | ------------------------ | -------- | ----------------------------------------- |
| `GET`    | `/data`                  | Optional | 游客按 `level=0` 过滤，登录用户按权限过滤 |
| `POST`   | `/data`                  | Admin    | 保存全量分类与书签数据                    |
| `POST`   | `/bookmark`              | Admin    | 创建书签                                  |
| `PUT`    | `/bookmark/:id`          | Admin    | 更新书签                                  |
| `PUT`    | `/bookmark/:id/move`     | Admin    | 移动书签到指定分类与位置                  |
| `DELETE` | `/bookmark/:id`          | Admin    | 永久删除书签                              |
| `POST`   | `/bookmark/batch-move`   | Admin    | 批量移动书签到指定分类                    |
| `POST`   | `/bookmark/batch-delete` | Admin    | 批量删除书签                              |
| `GET`    | `/bookmark/search`       | Yes      | 搜索当前权限范围内的书签                  |
| `GET`    | `/bookmark/check`        | Yes      | 检查当前权限范围内 URL 是否重复           |
| `GET`    | `/categories/simple`     | Yes      | 获取当前权限范围内的分类平铺列表          |
| `PUT`    | `/categories/reorder`    | Admin    | 批量调整分类顺序                          |
| `POST`   | `/category`              | Admin    | 创建分类                                  |
| `PUT`    | `/category/:id`          | Admin    | 更新分类（名称/图标/等级/父分类）         |
| `DELETE` | `/category/:id`          | Admin    | 删除分类（子分类回挂上级，书签迁移）      |
| `POST`   | `/sites/:id/click`       | No       | 记录书签点击统计                          |

### System and tools

| Method   | Path                 | Auth  | Notes                                                           |
| -------- | -------------------- | ----- | --------------------------------------------------------------- |
| `GET`    | `/health`            | No    | 系统健康状态                                                    |
| `GET`    | `/settings`          | No    | 公共站点设置                                                    |
| `POST`   | `/set-background`    | Admin | 直接设置背景图 URL                                              |
| `POST`   | `/upload-background` | Admin | 上传背景图，最大 5MB，最长边 4096px，校验实际图片内容           |
| `POST`   | `/upload-icon`       | Admin | 上传 logo 或 favicon，最大 5MB，最长边 4096px，校验实际图片内容 |
| `GET`    | `/uploads`           | Admin | 获取上传文件列表                                                |
| `DELETE` | `/uploads/:filename` | Admin | 删除上传文件                                                    |
| `GET`    | `/favicon`           | No    | 拉取站点 favicon 代理                                           |
| `GET`    | `/suggest`           | No    | 在线搜索建议                                                    |
| `POST`   | `/check-links`       | Admin | 批量检测公网 HTTP/HTTPS 链接有效性                              |

### Stats

> 说明：访问统计接口（`GET /stats` 汇总、`GET /cache` 缓存统计）与 PV/UV 数据采集（`POST /visit`）已随统计面板下线而**整体移除**，不再提供任何访问统计/采集接口。

## Public settings contract

`GET /api/settings` 当前返回站点公共配置，典型字段如下：

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "registrationEnabled": false,
    "backgroundUrl": "/uploads/bg_123.jpg",
    "timezone": "Asia/Shanghai",
    "homeUrl": "",
    "footerHtml": "",
    "siteName": "星语导航",
    "logoUrl": "/uploads/logo_123.png",
    "faviconUrl": "/uploads/icon_123.ico"
  }
}
```

这组字段会同时被首页、登录弹窗、时钟、背景、侧边栏等公共 UI 消费。

## Health contract

`GET /api/health` 典型返回：

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "status": "healthy",
    "version": "<app-version>",
    "timestamp": "2026-04-09T12:00:00.000Z",
    "checks": {
      "database": {
        "ok": true
      },
      "cache": {},
      "memory": {
        "heapUsed": "32MB",
        "heapTotal": "48MB",
        "rss": "92MB"
      },
      "uptime": 1234
    }
  }
}
```

## Docs source of truth

如果文档和代码冲突，以这些文件为准：

- `server.ts`
- `src/server/routes/*.ts`
- `src/server/controllers/*.ts`
- `src/server/services/**/*.ts`
