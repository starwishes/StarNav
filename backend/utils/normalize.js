/**
 * URL 规范化与安全清洗
 * 1. 强制 http/https 协议
 * 2. 域名转小写
 * 3. 移除跟踪参数 (UTM, SPM, FBCLID 等)
 * 4. 移除隐形字符和空白
 * 5. 路径清洗 (合并斜杠, 去除尾部斜杠)
 */
// 导入共享的 URL 规范化逻辑
import { normalizeUrl } from '../../common/url.js';
export { normalizeUrl };

/**
 * 数据清洗与归一化工具
 */

export const normalizeId = (id) => {
  const num = Number(id);
  return isNaN(num) ? 0 : num;
};

// 递归清洗对象中的 ID
export const normalizeData = (data) => {
  if (!data) return data;

  if (Array.isArray(data)) {
    // 过滤掉因为清洗失败（如URL无效）而返回 null 的项
    return data.map(item => normalizeData(item)).filter(item => item !== null);
  }

  if (typeof data === 'object') {
    const newData = { ...data };

    // 强制转换常见 ID 字段
    if ('id' in newData) newData.id = normalizeId(newData.id);
    if ('categoryId' in newData) newData.categoryId = normalizeId(newData.categoryId);

    // URL 清洗与安全验证 (核心防御)
    if ('url' in newData && typeof newData.url === 'string') {
      const cleaned = normalizeUrl(newData.url);
      // 如果清洗后 URL 为空（说明是无效或恶意链接），则丢弃该项
      if (!cleaned) return null;
      newData.url = cleaned;
    }

    // 权限模型迁移：移除 private，统一使用 level
    if (newData.private === true && (newData.level === undefined || newData.level === 0)) {
      newData.level = 1;
    }
    delete newData.private;

    // 递归处理子属性
    for (const key in newData) {
      if (typeof newData[key] === 'object' && newData[key] !== null) {
        newData[key] = normalizeData(newData[key]);
      }
    }
    return newData;
  }

  return data;
};
