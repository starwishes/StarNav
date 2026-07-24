import http from 'k6/http'
import { check, sleep } from 'k6'

/**
 * k6 性能测试 - 书签查询压测
 *
 * 运行方式:
 * k6 run tests/performance/bookmarks-load.js
 */

// 测试配置
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // 30秒内增加到20并发
    { duration: '1m', target: 50 }, // 1分钟保持50并发
    { duration: '30s', target: 100 }, // 30秒增加到100并发
    { duration: '10s', target: 0 } // 10秒降到0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%请求<500ms
    http_req_failed: ['rate<0.01'], // 错误率<1%
    http_reqs: ['rate>50'] // QPS>50
  }
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080'

const testUser = {
  username: __ENV.TEST_USERNAME || 'admin',
  password: __ENV.TEST_PASSWORD || 'admin123'
}

const SEARCH_KEYWORD = __ENV.SEARCH_KEYWORD || 'test'

const readToken = (response) => response.json('data.token') || response.json('token')

function login() {
  const loginRes = http.post(`${BASE_URL}/api/login`, JSON.stringify(testUser), {
    headers: { 'Content-Type': 'application/json' }
  })
  const token = readToken(loginRes)

  check(loginRes, {
    登录成功: (r) => r.status === 200,
    '返回 token': () => Boolean(token)
  })

  return token
}

// 主测试函数
export default function (context) {
  const token = context?.token

  if (!token) {
    console.error('缺少认证 token，跳过测试')
    return
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }

  // 1. 获取书签列表
  const dataRes = http.get(`${BASE_URL}/api/data`, { headers })
  check(dataRes, {
    获取数据成功: (r) => r.status === 200,
    '响应时间<200ms': (r) => r.timings.duration < 200,
    包含分类数据: (r) => Array.isArray(r.json('data.categories')),
    包含书签数据: (r) => Array.isArray(r.json('data.items'))
  })

  sleep(0.5)

  // 2. 搜索书签
  const searchRes = http.get(
    `${BASE_URL}/api/bookmark/search?q=${encodeURIComponent(SEARCH_KEYWORD)}&limit=10`,
    { headers }
  )
  check(searchRes, {
    搜索成功: (r) => r.status === 200,
    '响应时间<300ms': (r) => r.timings.duration < 300,
    返回搜索结果数组: (r) => Array.isArray(r.json('data.items'))
  })

  sleep(0.5)

  // 3. 获取分类
  const categoriesRes = http.get(`${BASE_URL}/api/categories/simple`, { headers })
  check(categoriesRes, {
    获取分类成功: (r) => r.status === 200,
    '响应时间<100ms': (r) => r.timings.duration < 100,
    返回分类数组: (r) => Array.isArray(r.json('data.categories'))
  })

  sleep(1)
}

// 测试开始前执行
export function setup() {
  const token = login()

  if (!token) {
    throw new Error('性能测试登录失败，请确认账号、密码与服务地址有效')
  }

  console.log(`🚀 开始性能测试`)
  console.log(`   目标: ${BASE_URL}`)
  console.log(`   用户: ${testUser.username}`)
  console.log(`   搜索词: ${SEARCH_KEYWORD}`)

  return {
    startTime: new Date().toISOString(),
    token
  }
}

// 测试结束后执行
export function teardown(data) {
  console.log(`\n✅ 测试完成`)
  console.log(`   开始时间: ${data.startTime}`)
  console.log(`   结束时间: ${new Date().toISOString()}`)
}
