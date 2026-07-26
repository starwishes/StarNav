import http from 'k6/http'
import { check, sleep } from 'k6'

/**
 * k6 性能测试 - 书签混合读写压测
 *
 * 运行方式:
 * k6 run tests/performance/bookmarks-mixed-load.js
 */

const PROFILE = (__ENV.K6_PROFILE || 'full').toLowerCase()

const FULL_OPTIONS = {
  stages: [
    { duration: '20s', target: 10 },
    { duration: '40s', target: 20 },
    { duration: '20s', target: 40 },
    { duration: '10s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01']
  }
}

const SMOKE_OPTIONS = {
  stages: [
    { duration: '15s', target: 8 },
    { duration: '25s', target: 15 },
    { duration: '10s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<1200'],
    http_req_failed: ['rate<0.03']
  }
}

export const options = PROFILE === 'smoke' ? SMOKE_OPTIONS : FULL_OPTIONS

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080'

const testUser = {
  username: __ENV.TEST_USERNAME || 'admin',
  password: __ENV.TEST_PASSWORD || 'admin123'
}

const SEARCH_KEYWORD = __ENV.SEARCH_KEYWORD || 'test'

const readToken = (response) => response.json('data.token') || response.json('token')
const buildHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
})
const shouldRunWriteFlow = () => __ITER % 3 === 0
const createSuffix = () => `${Date.now()}-${__VU}-${__ITER}`

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

function runReadFlow(headers) {
  const dataRes = http.get(`${BASE_URL}/api/data`, { headers })
  check(dataRes, {
    获取数据成功: (r) => r.status === 200,
    '读取响应时间<250ms': (r) => r.timings.duration < 250,
    包含分类数据: (r) => Array.isArray(r.json('data.categories')),
    包含书签数据: (r) => Array.isArray(r.json('data.items'))
  })

  const searchRes = http.get(
    `${BASE_URL}/api/bookmark/search?q=${encodeURIComponent(SEARCH_KEYWORD)}&limit=10`,
    { headers }
  )
  check(searchRes, {
    搜索成功: (r) => r.status === 200,
    '搜索响应时间<350ms': (r) => r.timings.duration < 350,
    返回搜索结果数组: (r) => Array.isArray(r.json('data.items'))
  })

  const categoriesRes = http.get(`${BASE_URL}/api/categories/simple`, { headers })
  check(categoriesRes, {
    获取分类成功: (r) => r.status === 200,
    '分类响应时间<150ms': (r) => r.timings.duration < 150,
    返回分类数组: (r) => Array.isArray(r.json('data.categories'))
  })
}

function runWriteFlow(headers) {
  const suffix = createSuffix()

  const createCategoryRes = http.post(
    `${BASE_URL}/api/category`,
    JSON.stringify({
      name: `Perf Category ${suffix}`,
      icon: '',
      level: 0
    }),
    { headers }
  )
  const categoryId = createCategoryRes.json('data.item.id')

  check(createCategoryRes, {
    分类创建成功: (r) => r.status === 200,
    '分类返回 ID': () => Boolean(categoryId)
  })

  if (!categoryId) {
    return
  }

  const createBookmarkRes = http.post(
    `${BASE_URL}/api/bookmark`,
    JSON.stringify({
      name: `Perf Bookmark ${suffix}`,
      url: `https://perf-${suffix}.example.com`,
      description: 'k6 mixed load test item',
      categoryId,
      level: 0
    }),
    { headers }
  )
  const bookmarkId = createBookmarkRes.json('data.item.id')

  check(createBookmarkRes, {
    书签创建成功: (r) => r.status === 200,
    '书签返回 ID': () => Boolean(bookmarkId)
  })

  if (!bookmarkId) {
    http.delete(`${BASE_URL}/api/category/${categoryId}`, null, { headers })
    return
  }

  const updateBookmarkRes = http.put(
    `${BASE_URL}/api/bookmark/${bookmarkId}`,
    JSON.stringify({
      description: `updated-${suffix}`
    }),
    { headers }
  )
  check(updateBookmarkRes, {
    书签更新成功: (r) => r.status === 200
  })

  const deleteBookmarkRes = http.del(`${BASE_URL}/api/bookmark/${bookmarkId}`, null, { headers })
  check(deleteBookmarkRes, {
    书签删除成功: (r) => r.status === 200
  })

  const deleteCategoryRes = http.del(`${BASE_URL}/api/category/${categoryId}`, null, { headers })
  check(deleteCategoryRes, {
    分类删除成功: (r) => r.status === 200
  })
}

export default function (context) {
  const token = context?.token
  if (!token) {
    console.error('缺少认证 token，跳过测试')
    return
  }

  const headers = buildHeaders(token)

  runReadFlow(headers)

  if (shouldRunWriteFlow()) {
    runWriteFlow(headers)
  }

  sleep(1)
}

export function setup() {
  const token = login()

  if (!token) {
    throw new Error('性能测试登录失败，请确认账号、密码与服务地址有效')
  }

  console.log('🚀 开始混合读写性能测试')
  console.log(`   目标: ${BASE_URL}`)
  console.log(`   用户: ${testUser.username}`)
  console.log(`   搜索词: ${SEARCH_KEYWORD}`)
  console.log('   写流量比例: 每 3 次迭代执行 1 次完整 CRUD 流')

  return {
    startTime: new Date().toISOString(),
    token
  }
}

export function teardown(data) {
  console.log('\n✅ 混合读写测试完成')
  console.log(`   开始时间: ${data.startTime}`)
  console.log(`   结束时间: ${new Date().toISOString()}`)
}
