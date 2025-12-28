import express from 'express';
import jwt from 'jsonwebtoken';
import { db, logger } from '../services/db.js';
import { JWT_SECRET, getUserDataPath, DEFAULT_ADMIN_NAME } from '../config/index.js';
import { authenticate } from '../middleware/auth.js';
import { dataUpdateLimiter } from '../middleware/limiter.js';
import { dataSchema } from '../middleware/validation.js';

const router = express.Router();

router.get('/data', (req, res) => {
  const targetUser = req.query.user || DEFAULT_ADMIN_NAME;
  const dataPath = getUserDataPath(targetUser);

  let visitorLevel = 0;
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      visitorLevel = decoded.level || 0;
    } catch (e) { }
  }

  const rawData = db.read(dataPath, { categories: [], items: [] });
  const filteredCategories = (rawData.categories || []).filter(cat => (cat.level || 0) <= visitorLevel);
  const categoryIds = new Set(filteredCategories.map(c => c.id));
  const filteredItems = (rawData.items || []).filter(item => categoryIds.has(item.categoryId) && (item.level || 0) <= visitorLevel);

  res.json({ content: { categories: filteredCategories, items: filteredItems } });
});

router.post('/data', authenticate, dataUpdateLimiter, (req, res) => {
  const { error } = dataSchema.validate(req.body);
  if (error) return res.status(400).json({ error: '数据格式不正确' });

  const username = req.user.username;
  if (db.write(getUserDataPath(username), req.body.content)) {
    logger.info(`数据保存成功: ${username}`);
    res.json({ success: true });
  } else {
    res.status(500).json({ error: '保存数据失败' });
  }
});

router.post('/sites/:id/click', (req, res) => {
  const siteId = parseInt(req.params.id);
  const targetUser = req.query.user || DEFAULT_ADMIN_NAME;
  const dataPath = getUserDataPath(targetUser);

  const rawData = db.read(dataPath, null);
  if (!rawData) return res.status(404).json({ error: '数据不存在' });

  const item = rawData.items.find(i => i.id === siteId);
  if (!item) return res.status(404).json({ error: '书签不存在' });

  item.clickCount = (item.clickCount || 0) + 1;
  item.lastVisited = new Date().toISOString();

  if (db.write(dataPath, rawData)) {
    logger.info(`点击统计更新: ${item.name}`);
    res.json({ success: true, clickCount: item.clickCount });
  } else {
    res.status(500).json({ error: '统计更新失败' });
  }
});

export default router;
