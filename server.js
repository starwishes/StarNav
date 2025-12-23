import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, 'src/config/data.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// 简易日志工具
const logger = {
  info: (msg, data = {}) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
  error: (msg, err = {}) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err),
  warn: (msg, data = {}) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data),
};

// 环境参数验证
const checkEnvVars = () => {
  const required = ['JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    logger.warn(`环境变量缺失: ${missing.join(', ')}，将使用默认值。`);
  }
};
checkEnvVars();

// 预处理管理员密码 (支持明文或哈希)
let hashedAdminPassword = ADMIN_PASSWORD;
if (!ADMIN_PASSWORD.startsWith('$2a$') && !ADMIN_PASSWORD.startsWith('$2b$')) {
  hashedAdminPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  logger.info('管理员密码已在启动时完成哈希处理');
}

app.use(cors());
app.use(express.json());

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
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    if (username === ADMIN_USERNAME && bcrypt.compareSync(password, hashedAdminPassword)) {
      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
      logger.info(`用户登录成功: ${username}`);
      return res.json({
        token,
        user: { login: username, name: username, avatar_url: '' }
      });
    }
    logger.warn(`登录失败尝试: ${username}`);
    res.status(401).json({ error: '用户名或密码错误' });
  } catch (err) {
    logger.error('登录过程出错', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取数据接口
app.get('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      logger.warn('数据文件不存在，返回初始数据结构', { path: DATA_PATH });
      return res.json({ content: { categories: [], items: [] } });
    }
    const data = fs.readFileSync(DATA_PATH, 'utf8');
    res.json({ content: JSON.parse(data) });
  } catch (err) {
    logger.error('读取数据失败', err);
    res.status(500).json({ error: '获取数据失败' });
  }
});

// 更新数据接口
app.post('/api/data', authenticate, (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.categories || !content.items) {
      return res.status(400).json({ error: '无效的数据结构' });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(content, null, 2), 'utf8');
    logger.info('数据保存成功', { user: req.user.username });
    res.json({ success: true });
  } catch (err) {
    logger.error('保存数据失败', err);
    res.status(500).json({ error: '保存数据失败' });
  }
});

// Favicon 代理接口
app.get('/api/favicon', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: '缺少 URL 参数' });

  try {
    const urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    const hostname = urlObj.hostname;

    const services = [
      `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
      `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
      `https://favicon.im/${hostname}?larger=true`,
    ];

    for (const serviceUrl of services) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时

        const response = await fetch(serviceUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const buffer = await response.arrayBuffer();
          res.setHeader('Content-Type', response.headers.get('content-type') || 'image/x-icon');
          res.setHeader('Cache-Control', 'public, max-age=86400'); // 24小时缓存
          return res.send(Buffer.from(buffer));
        }
      } catch (e) {
        continue;
      }
    }
    res.status(404).json({ error: '未找到图标' });
  } catch (err) {
    logger.error('Favicon 获取异常', { url: targetUrl, error: err.message });
    res.status(500).json({ error: '获取图标过程中发生意外错误' });
  }
});

// 所有其他请求重定向到 index.html (SPA 支持)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
