import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'src/config/users');
const ACCOUNTS_PATH = path.join(__dirname, 'src/config/accounts.json');
const SETTINGS_PATH = path.join(__dirname, 'src/config/settings.json');
const DATA_PATH_LEGACY = path.join(__dirname, 'src/config/data.json');
const JWT_SECRET_PATH = path.join(__dirname, 'src/config/.jwt_secret');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// 自动生成/读取 JWT Secret
const getOrCreateJwtSecret = () => {
  try {
    if (fs.existsSync(JWT_SECRET_PATH)) {
      return fs.readFileSync(JWT_SECRET_PATH, 'utf8').trim();
    }
    // 生成 256 位随机密钥
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(JWT_SECRET_PATH, secret, { mode: 0o600 });
    console.log('[INFO] JWT Secret 已自动生成并保存');
    return secret;
  } catch (err) {
    console.error('[ERROR] JWT Secret 初始化失败', err);
    return crypto.randomBytes(32).toString('hex');
  }
};
const JWT_SECRET = getOrCreateJwtSecret();

// 简易日志工具
const logger = {
  info: (msg, data = {}) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
  error: (msg, err = {}) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err),
  warn: (msg, data = {}) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data),
};


// 数据读写工具
const readJson = (filePath, defaultVal = []) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    logger.error(`读取文件失败: ${filePath}`, err);
  }
  return defaultVal;
};

const writeJson = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    logger.error(`写入文件失败: ${filePath}`, err);
    return false;
  }
};

// 系统配置
let settings = readJson(SETTINGS_PATH, { registrationEnabled: false, defaultUserLevel: 1 });
let accounts = readJson(ACCOUNTS_PATH, []);

// 初始化管理员
const initAdmin = () => {
  const adminExists = accounts.find(u => u.username === ADMIN_USERNAME);
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    accounts.push({
      username: ADMIN_USERNAME,
      password: hashedPassword,
      level: 3,
      createdAt: new Date().toISOString()
    });
    writeJson(ACCOUNTS_PATH, accounts);
    logger.info('初始化管理员账户成功');
  }
};
initAdmin();

// 确保用户数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 迁移逻辑: 将旧的 data.json 移动到 users/admin.json
const migrateData = () => {
  const adminPath = path.join(DATA_DIR, `${ADMIN_USERNAME}.json`);
  if (fs.existsSync(DATA_PATH_LEGACY) && !fs.existsSync(adminPath)) {
    try {
      fs.copyFileSync(DATA_PATH_LEGACY, adminPath);
      logger.info('成功将 legacy data.json 迁移到用户目录', { user: ADMIN_USERNAME });
    } catch (err) {
      logger.error('迁移数据失败', err);
    }
  }
};
migrateData();

// 获取具体用户的数据路径
const getUserDataPath = (username) => path.join(DATA_DIR, `${username}.json`);

// 环境参数验证
const checkEnvVars = () => {
  const required = ['ADMIN_USERNAME', 'ADMIN_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    logger.warn(`环境变量缺失: ${missing.join(', ')}，将使用默认值。`);
  }
};
checkEnvVars();

// 已移除旧的 hashedAdminPassword 逻辑，改用 accounts 数组处理

// Helmet 安全头 + CSP 配置
// 注意: Vue/Vite 构建的 SPA 需要 unsafe-inline
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS 配置
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : [
    'http://localhost:3000', 'http://localhost:3333', 'http://localhost:5173',
    'http://127.0.0.1:3000', 'http://127.0.0.1:3333', 'http://127.0.0.1:5173'
  ];

app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（同源请求、服务器端请求）
    if (!origin) {
      callback(null, true);
    } else if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS 被拒绝', { origin });
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// 速率限制配置
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 10, // 每个 IP 限制 10 次
  message: { error: '登录尝试过于频繁，请 15 分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const dataUpdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟
  max: 30, // 每个 IP 限制 30 次
  message: { error: '更新操作过于频繁' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 数据验证架构
const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
});

const itemSchema = Joi.object({
  id: Joi.number().required(),
  name: Joi.string().required(),
  url: Joi.string().uri().required(),
  description: Joi.string().allow(''),
  categoryId: Joi.number().required(),
  private: Joi.boolean().default(false),
  pinned: Joi.boolean().default(false),
  level: Joi.number().integer().min(0).max(3).default(0),
  clickCount: Joi.number().integer().min(0).optional(),
  lastVisited: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

const categorySchema = Joi.object({
  id: Joi.number().required(),
  name: Joi.string().required(),
  private: Joi.boolean().optional(),
  level: Joi.number().integer().min(0).max(3).default(0),
});

const dataSchema = Joi.object({
  content: Joi.object({
    categories: Joi.array().items(categorySchema).required(),
    items: Joi.array().items(itemSchema).required(),
  }).required(),
});

// 请求日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// 静态文件服务 - 指向构建后的 dist 目录
app.use(express.static(path.join(__dirname, 'dist')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// 身份验证中间件
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    logger.warn('未授权访问尝试', { path: req.path });
    return res.status(401).json({ error: '未授权' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.error('无效令牌', { error: err.message });
    res.status(401).json({ error: '无效令牌' });
  }
};

// 登录接口
app.post('/api/login', loginLimiter, async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: '输入格式不正确' });

  const { username, password } = req.body;
  const user = accounts.find(u => u.username === username);

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ username: user.username, level: user.level }, JWT_SECRET, { expiresIn: '7d' });
    logger.info(`用户登录成功: ${username} (Level: ${user.level})`);
    return res.json({
      token,
      user: { login: username, name: username, level: user.level }
    });
  }

  logger.warn(`登录失败尝试: ${username}`);
  res.status(401).json({ error: '用户名或密码错误' });
});

// 注册接口
app.post('/api/register', loginLimiter, async (req, res) => {
  if (!settings.registrationEnabled) {
    return res.status(403).json({ error: '注册功能已关闭' });
  }

  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: '输入格式不正确' });

  const { username, password } = req.body;
  if (accounts.some(u => u.username === username)) {
    return res.status(400).json({ error: '该用户名已被注册' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    username,
    password: hashedPassword,
    level: settings.defaultUserLevel || 1,
    createdAt: new Date().toISOString()
  };

  accounts.push(newUser);
  writeJson(ACCOUNTS_PATH, accounts);
  logger.info(`新用户注册: ${username}`);

  res.json({ success: true, message: '注册成功' });
});

// 公开设置接口 (供未登录用户使用，如展示注册功能是否开启)
app.get('/api/settings', (req, res) => {
  res.json({
    registrationEnabled: settings.registrationEnabled
  });
});

// 管理员获取设置
app.get('/api/admin/settings', authenticate, (req, res) => {
  if (req.user.level < 3) return res.status(403).json({ error: '权限不足' });
  res.json(settings);
});

// 管理员更新设置
app.post('/api/admin/settings', authenticate, (req, res) => {
  if (req.user.level < 3) return res.status(403).json({ error: '权限不足' });
  settings = { ...settings, ...req.body };
  writeJson(SETTINGS_PATH, settings);
  res.json({ success: true });
});

// 管理员获取用户列表
app.get('/api/admin/users', authenticate, (req, res) => {
  if (req.user.level < 3) return res.status(403).json({ error: '权限不足' });
  const userList = accounts.map(({ password, ...u }) => u);
  res.json(userList);
});

// 管理员添加用户
app.post('/api/admin/users', authenticate, async (req, res) => {
  if (req.user.level < 3) return res.status(403).json({ error: '权限不足' });
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: '输入格式不正确' });

  const { username, password, level } = req.body;
  if (accounts.some(u => u.username === username)) {
    return res.status(400).json({ error: '该用户名已存在' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    username,
    password: hashedPassword,
    level: level || settings.defaultUserLevel || 1,
    createdAt: new Date().toISOString()
  };

  accounts.push(newUser);
  writeJson(ACCOUNTS_PATH, accounts);
  logger.info(`管理员手动创建用户: ${username}`);
  res.json({ success: true });
});

// 管理员更新用户 (如修改等级、修改用户名)
app.patch('/api/admin/users/:username', authenticate, (req, res) => {
  if (req.user.level < 3) return res.status(403).json({ error: '权限不足' });
  const oldUsername = req.params.username;
  const index = accounts.findIndex(u => u.username === oldUsername);
  if (index === -1) return res.status(404).json({ error: '用户不存在' });

  const target = accounts[index];
  const { level, username: newUsername, password } = req.body;

  if (level !== undefined) target.level = level;
  if (password) target.password = bcrypt.hashSync(password, 10);

  if (newUsername && newUsername !== oldUsername) {
    if (accounts.some(u => u.username === newUsername)) {
      return res.status(400).json({ error: '新的用户名已被占用' });
    }
    // 重命名数据文件
    const oldPath = getUserDataPath(oldUsername);
    const newPath = getUserDataPath(newUsername);
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      logger.info(`用户数据文件重命名: ${oldUsername} -> ${newUsername}`);
    }
    target.username = newUsername;
    logger.info(`管理员修改用户名: ${oldUsername} -> ${newUsername}`);
  }

  writeJson(ACCOUNTS_PATH, accounts);
  res.json({ success: true, user: { username: target.username, level: target.level } });
});

// 管理员删除用户
app.delete('/api/admin/users/:username', authenticate, (req, res) => {
  if (req.user.level < 3) return res.status(403).json({ error: '权限不足' });
  const username = req.params.username;
  if (username === ADMIN_USERNAME || username === req.user.username) {
    return res.status(400).json({ error: '不能删除自己或系统管理员' });
  }

  const index = accounts.findIndex(u => u.username === username);
  if (index === -1) return res.status(404).json({ error: '用户不存在' });

  // 删除数据文件
  const dataPath = getUserDataPath(username);
  if (fs.existsSync(dataPath)) {
    fs.unlinkSync(dataPath);
    logger.info(`已删除用户数据文件: ${username}`);
  }

  accounts.splice(index, 1);
  writeJson(ACCOUNTS_PATH, accounts);
  logger.info(`管理员删除了用户: ${username}`);
  res.json({ success: true });
});

// 用户修改信息 (支持修改用户名、密码)
app.patch('/api/profile', authenticate, (req, res) => {
  const oldUsername = req.user.username;
  const user = accounts.find(u => u.username === oldUsername);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const { username: newUsername, password } = req.body;

  if (password) {
    user.password = bcrypt.hashSync(password, 10);
  }

  if (newUsername && newUsername !== oldUsername) {
    if (accounts.some(u => u.username === newUsername)) {
      return res.status(400).json({ error: '用户名已被占用' });
    }
    // 重命名数据文件
    const oldPath = getUserDataPath(oldUsername);
    const newPath = getUserDataPath(newUsername);
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }
    user.username = newUsername;
    logger.info(`用户自己修改了用户名: ${oldUsername} -> ${newUsername}`);
  }

  writeJson(ACCOUNTS_PATH, accounts);

  // 如果修改了用户名，前端需要重新获取 Token 或更新本地存储
  const newToken = jwt.sign({ username: user.username, level: user.level }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    success: true,
    token: newToken,
    user: { login: user.username, name: user.username, level: user.level }
  });
});

// 获取数据接口
app.get('/api/data', (req, res) => {
  const targetUser = req.query.user || ADMIN_USERNAME;
  const dataPath = getUserDataPath(targetUser);

  // 获取访问者的等级
  let visitorLevel = 0;
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      visitorLevel = decoded.level || 0;
    } catch (e) { }
  }

  try {
    if (!fs.existsSync(dataPath)) {
      return res.json({ content: { categories: [], items: [] } });
    }
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // 基于等级过滤
    const filteredCategories = (rawData.categories || []).filter(cat => (cat.level || 0) <= visitorLevel);
    const categoryIds = new Set(filteredCategories.map(c => c.id));

    const filteredItems = (rawData.items || []).filter(item => {
      return categoryIds.has(item.categoryId) && (item.level || 0) <= visitorLevel;
    });

    res.json({ content: { categories: filteredCategories, items: filteredItems } });
  } catch (err) {
    logger.error('读取数据失败', err);
    res.status(500).json({ error: '获取数据失败' });
  }
});

// 更新数据接口
app.post('/api/data', authenticate, dataUpdateLimiter, (req, res) => {
  const username = req.user.username; // 从 JWT 中获取加密的用户名
  const dataPath = getUserDataPath(username);

  try {
    const { error } = dataSchema.validate(req.body);
    if (error) {
      logger.warn('数据验证失败', { details: error.details });
      return res.status(400).json({ error: '数据格式不符合要求' });
    }
    const { content } = req.body;
    if (!content || !content.categories || !content.items) {
      return res.status(400).json({ error: '无效的数据结构' });
    }
    fs.writeFileSync(dataPath, JSON.stringify(content, null, 2), 'utf8');
    logger.info('数据保存成功', { user: username });
    res.json({ success: true });
  } catch (err) {
    logger.error('保存数据失败', err);
    res.status(500).json({ error: '保存数据失败' });
  }
});

// 记录书签点击统计
app.post('/api/sites/:id/click', (req, res) => {
  const siteId = parseInt(req.params.id);
  const targetUser = req.query.user || ADMIN_USERNAME;
  const dataPath = getUserDataPath(targetUser);

  try {
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ error: '数据不存在' });
    }

    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const item = rawData.items.find(i => i.id === siteId);

    if (!item) {
      return res.status(404).json({ error: '书签不存在' });
    }

    // 更新统计数据
    item.clickCount = (item.clickCount || 0) + 1;
    item.lastVisited = new Date().toISOString();

    // 保存更新后的数据
    fs.writeFileSync(dataPath, JSON.stringify(rawData, null, 2), 'utf8');
    logger.info(`书签点击统计更新: ${item.name} (ID: ${siteId}, Count: ${item.clickCount})`);

    res.json({
      success: true,
      clickCount: item.clickCount,
      lastVisited: item.lastVisited
    });
  } catch (err) {
    logger.error('更新统计失败', err);
    res.status(500).json({ error: '更新统计失败' });
  }
});


// Favicon 缓存（内存）
const faviconCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

// Favicon 代理接口（优化版）
app.get('/api/favicon', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: '缺少 URL 参数' });

  try {
    const urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    const hostname = urlObj.hostname;

    // SSRF 防御
    const isPrivate = /^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(hostname);
    if (isPrivate) {
      return res.status(403).json({ error: '不允许访问私有网络' });
    }

    // 检查缓存
    const cacheKey = hostname;
    const cached = faviconCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.set('Cache-Control', 'public, max-age=604800');
      res.set('Content-Type', cached.contentType);
      return res.send(cached.data);
    }

    // 并行请求多个服务（谁先返回用谁）
    const services = [
      `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
      `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
      `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostname}&size=64`,
    ];

    const fetchWithTimeout = async (url, timeout = 2000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          // 检查是否是有效图片（至少有一些数据）
          if (buffer.length > 100) {
            return {
              data: buffer,
              contentType: response.headers.get('content-type') || 'image/x-icon'
            };
          }
        }
        return null;
      } catch (e) {
        clearTimeout(timeoutId);
        return null;
      }
    };

    // 使用 Promise.any 获取第一个成功的结果
    try {
      const result = await Promise.any(services.map(url =>
        fetchWithTimeout(url).then(r => {
          if (r) return r;
          throw new Error('No result');
        })
      ));

      // 缓存结果
      faviconCache.set(cacheKey, {
        data: result.data,
        contentType: result.contentType,
        timestamp: Date.now()
      });

      res.set('Cache-Control', 'public, max-age=604800, s-maxage=86400');
      res.set('Content-Type', result.contentType);
      return res.send(result.data);
    } catch (e) {
      // 所有服务都失败，返回默认图标
      res.status(404).json({ error: '未找到图标' });
    }
  } catch (err) {
    logger.error('Favicon 获取异常', { url: targetUrl, error: err.message });
    res.status(500).json({ error: '获取图标失败' });
  }
});

// 搜索建议接口 (代理)
app.get('/api/suggest', async (req, res) => {
  const { keyword, type = 'baidu' } = req.query;
  if (!keyword) return res.json([]);

  try {
    let url = '';
    if (type === 'baidu') {
      url = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(keyword)}&cb=`;
    } else if (type === 'google') {
      url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(keyword)}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Fetch failed');

    if (type === 'baidu') {
      const text = await response.text();
      // 百度返回的是 window.baidu.sug({q:"...",p:false,s:["..."]});
      const match = text.match(/s:\[(.*)\]/);
      if (match) {
        const results = JSON.parse(`[${match[1]}]`);
        return res.json(results);
      }
    } else {
      const data = await response.json();
      return res.json(data[1] || []);
    }
    res.json([]);
  } catch (err) {
    logger.error('获取建议失败', err);
    res.json([]);
  }
});

// 链接健康检查 API
app.post('/api/check-links', authenticate, async (req, res) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: '请提供 URL 数组' });
  }

  const results = await Promise.all(urls.map(async (url) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 LinkChecker' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return {
        url,
        status: response.ok ? 'ok' : 'error',
        statusCode: response.status
      };
    } catch (err) {
      return {
        url,
        status: 'error',
        statusCode: 0,
        error: err.name === 'AbortError' ? '超时' : '无法访问'
      };
    }
  }));

  res.json({ results });
});

// 上传目录
const UPLOADS_DIR = path.join(__dirname, 'src/config/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 静态文件服务 - 上传文件
app.use('/uploads', express.static(UPLOADS_DIR));

// 背景图上传 API (使用 base64)
app.post('/api/upload-background', authenticate, async (req, res) => {
  try {
    const { data, filename: originalName } = req.body;
    if (!data) {
      return res.status(400).json({ error: '请提供图片数据' });
    }

    // 解析 base64 数据
    const matches = data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: '无效的图片格式' });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = `background_${Date.now()}.${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filepath, buffer);

    // 更新设置
    settings.backgroundUrl = `/uploads/${filename}`;
    writeJson(SETTINGS_PATH, settings);

    res.json({ success: true, url: settings.backgroundUrl });
  } catch (err) {
    logger.error('背景上传失败', err);
    res.status(500).json({ error: '上传失败' });
  }
});

// 设置背景 URL API
app.post('/api/set-background', authenticate, async (req, res) => {
  const { url } = req.body;
  settings.backgroundUrl = url || '';
  writeJson(SETTINGS_PATH, settings);
  res.json({ success: true });
});

// 公开设置 API（无需登录）
app.get('/api/public-settings', (req, res) => {
  res.json({
    backgroundUrl: settings.backgroundUrl || ''
  });
});

// 所有其他请求重定向到 index.html (SPA 支持)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
