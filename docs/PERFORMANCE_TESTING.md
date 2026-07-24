# k6 性能测试指南

当前性能脚本分为两类：

- `tests/performance/bookmarks-load.js`：只读基线，覆盖三个高频读路径
- `tests/performance/bookmarks-mixed-load.js`：混合读写回归，在只读流量之间穿插分类/书签 CRUD

只读基线覆盖的三个读路径：

- `GET /api/data`
- `GET /api/bookmark/search`
- `GET /api/categories/simple`

两个脚本都会先在 `setup()` 阶段通过 `POST /api/login` 获取一次 token，再把同一 token 复用到每个虚拟用户请求里，避免把登录开销混进书签性能结果。

## 统一入口

优先使用：

```bash
npm run test:performance:bookmarks
npm run test:performance:bookmarks:mixed
```

这个入口会按下面的顺序自动选择：

1. 本机已安装 `k6`：直接执行 `k6 run`
2. 本机未安装 `k6` 且当前环境是 Linux / WSL：自动回退到 `grafana/k6` Docker 镜像

当前 npm script 入口由 [package.json](../package.json) 中的 `src/server/tools/runBookmarksPerformanceTest.js` 统一承接；默认运行只读基线，也支持通过脚本参数切换到混合读写场景，不再要求每次手拼 `docker run`。

## 安装 k6

### macOS

```bash
brew install k6
```

### Ubuntu/Debian

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Windows

```bash
choco install k6
```

### Docker

```bash
docker pull grafana/k6
```

---

## 运行测试

### 基本运行

```bash
# 确保应用正在运行
npm install
npm run build
npm run serve

# 在另一个终端运行测试
npm run test:performance:bookmarks
```

### 自定义配置

```bash
# 自定义目标URL
BASE_URL=http://production.example.com npm run test:performance:bookmarks

# 自定义测试账户
TEST_USERNAME=testuser TEST_PASSWORD=testpass npm run test:performance:bookmarks

# 自定义搜索词
SEARCH_KEYWORD=github npm run test:performance:bookmarks

# 运行混合读写场景
npm run test:performance:bookmarks:mixed
```

---

## 测试配置说明

### 当前配置

```javascript
stages: [
  { duration: '30s', target: 20 }, // 30秒内增加到20并发
  { duration: '1m', target: 50 }, // 1分钟保持50并发
  { duration: '30s', target: 100 }, // 30秒增加到100并发
  { duration: '10s', target: 0 } // 10秒降到0
]
```

**总时长**: 2分10秒  
**最大并发**: 100  
**测试场景**: setup 登录 → 获取数据 → 搜索 → 获取分类

### 混合读写配置

```javascript
stages: [
  { duration: '20s', target: 10 },
  { duration: '40s', target: 20 },
  { duration: '20s', target: 40 },
  { duration: '10s', target: 0 }
]
```

**总时长**: 1分30秒  
**最大并发**: 40  
**测试场景**: setup 登录 → 读路径检查 → 每 3 次迭代插入 1 次完整分类/书签 CRUD 流

## 最近基线

### 2026-04-12 正式 k6 基线

环境：

- 隔离运行目录：`/tmp/starnav-k6-run.pbstC2`
- 目标实例：`http://127.0.0.1:38082`
- 数据规模：`60` 个分类、`6000` 条书签
- 搜索词：`test`

结果：

| 指标                    | 数值             |
| :---------------------- | :--------------- |
| `http_req_duration avg` | `12.1ms`         |
| `http_req_duration p95` | `40.27ms`        |
| `http_req_duration max` | `181.29ms`       |
| `http_req_failed`       | `0.00% (0/7615)` |
| `http_reqs`             | `57.82 req/s`    |
| `iterations`            | `2538`           |
| `checks_total`          | `25382`          |
| `checks_succeeded`      | `100%`           |

阈值结论：

- `p(95)<500ms`：通过
- `rate<0.01`：通过
- `rate>50`：通过

### 性能阈值

| 指标                | 阈值        | 说明                  |
| ------------------- | ----------- | --------------------- |
| `http_req_duration` | p(95)<500ms | 95%请求响应时间<500ms |
| `http_req_failed`   | rate<0.01   | 错误率<1%             |
| `http_reqs`         | rate>50     | QPS>50                |

---

## 测试结果解读

### 成功示例

```
✓ 登录成功
✓ 获取数据成功
✓ 响应时间<200ms
✓ 搜索成功

checks.........................: 100.00% ✓ 4000  ✗ 0
http_req_duration..............: avg=125ms  p(95)=350ms
http_req_failed................: 0.00%   ✓ 0     ✗ 4000
http_reqs......................: 4000    65/s
```

**结论**: ✅ 性能达标

### 需要优化的情况

```
✗ 响应时间<200ms (仅60%通过)

http_req_duration..............: avg=450ms  p(95)=850ms
http_req_failed................: 2.5%    ✓ 100   ✗ 3900
```

**结论**: ⚠️ 需要优化

**优化建议**:

1. 先看 `/api/health`、`/api/cache` 和后台统计面板，确认是否是数据库、缓存或资源瓶颈
2. 启用缓存
3. 优化数据库索引
4. 增加服务器资源

---

## 自定义测试场景

### 修改并发量

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 200 } // 更高并发
  ]
}
```

### 添加新测试场景

```javascript
// 4. 添加书签
const addRes = http.post(
  `${BASE_URL}/api/bookmark`,
  JSON.stringify({
    name: 'Test Bookmark',
    url: 'https://test.com',
    categoryId: 1
  }),
  { headers }
)
check(addRes, {
  添加成功: (r) => r.status === 200
})
```

### 混合场景建议

- 先跑 `npm run test:performance:bookmarks` 建立只读基线，再跑 `npm run test:performance:bookmarks:mixed` 观察写流量对延迟和失败率的影响。
- 如果需要更强写压，可直接调整 `tests/performance/bookmarks-mixed-load.js` 中的写流量比例，或把 stage 并发上调到更接近生产峰值。
- 资源监控建议与压测并行执行，例如同时观察 `GET /api/health`、后台系统健康面板、`docker stats` 或宿主机的 CPU / 内存 / I/O 曲线。

---

## 持续集成

### GitHub Actions 示例

```yaml
name: Performance Test

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Start application
        run: |
          npm ci
          npm run build
          tsx server.ts &
          sleep 10

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run k6 test
        run: npm run test:performance:bookmarks
```

---

## 性能基准建立

### 记录基准

首次运行测试后，记录关键指标作为基准：

```
基准日期: 2026-01-23
环境: 开发环境 (本地)
配置: 4核 8GB

http_req_duration (avg): 125ms
http_req_duration (p95): 350ms
QPS: 65
错误率: 0%
```

### 定期对比

每次重大变更后重新运行测试，对比基准：

| 指标     | 基准  | 当前  | 变化     |
| -------- | ----- | ----- | -------- |
| 平均响应 | 125ms | 110ms | ✅ -12%  |
| P95响应  | 350ms | 320ms | ✅ -8.6% |
| QPS      | 65    | 75    | ✅ +15%  |
| 错误率   | 0%    | 0%    | ✅ 持平  |

---

**创建时间**: 2026-01-23  
**最后更新**: 2026-04-12
