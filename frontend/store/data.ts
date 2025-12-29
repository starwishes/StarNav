import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Category, Item } from '@/types';
import { dataApi } from '@/api';
import { ElMessage } from 'element-plus';

export const useDataStore = defineStore('data', () => {
    // --- State ---
    const categories = ref<Category[]>([]);
    const items = ref<Item[]>([]);
    const loading = ref(false);
    const saving = ref(false);
    const initialized = ref(false);

    // --- Getters ---

    // 获取经过处理的分类列表（含内容）- 用于前端展示
    // 注意：这里不做过滤，过滤逻辑（权限、Tag）由 UI 层或专门的 getter 处理
    const siteData = computed(() => {
        // 创建 ID 映射以加速查找
        const itemMap = new Map<number, Item[]>();
        categories.value.forEach(cat => itemMap.set(cat.id, []));

        items.value.forEach(item => {
            const list = itemMap.get(item.categoryId);
            if (list) {
                list.push(item);
            } else {
                // 如果找不到分类，暂时放入未分类或忽略？
                // 目前逻辑是忽略，或者可以有一个默认分类
            }
        });

        return categories.value.map(cat => ({
            ...cat,
            content: itemMap.get(cat.id) || []
        }));
    });

    // --- Actions ---

    // 1. 加载数据
    const loadData = async (username?: string) => {
        loading.value = true;
        try {
            const res = await dataApi.getContent(username);
            const content = res.data || res.content;

            if (content) {
                // 强制类型清洗
                categories.value = (content.categories || []).map(c => ({
                    ...c,
                    id: Number(c.id),
                    name: String(c.name || ''),
                    level: Number(c.level || 0)
                }));

                const seenIds = new Set<number>();
                const rawItems = Array.isArray(content.items) ? content.items : [];
                items.value = rawItems.filter(i => {
                    if (!i || !i.name) return false;
                    const id = Number(i.id);
                    if (isNaN(id) || seenIds.has(id)) return false; // 去重
                    seenIds.add(id);
                    return true;
                }).map(i => ({
                    ...i,
                    id: Number(i.id),
                    categoryId: Number(i.categoryId),
                    level: Number(i.level || 0),
                    pinned: !!i.pinned,
                    tags: Array.isArray(i.tags) ? i.tags : []
                }));

                initialized.value = true;
            }
        } catch (error: any) {
            console.error('Failed to load data', error);
            ElMessage.error('加载失败: ' + error.message);
        } finally {
            loading.value = false;
        }
    };

    // 2. 保存数据 (同步到服务器)
    const sync = async (action?: string) => {
        saving.value = true;
        try {
            const payload: any = {
                categories: categories.value,
                items: items.value
            };
            if (action) payload.action = action;
            await dataApi.saveContent(payload);
        } catch (error: any) {
            console.error('Sync failed', error);
            // Show detailed error message if available
            const msg = error.message || '保存失败';
            ElMessage.error(msg);
            throw error;
        } finally {
            saving.value = false;
        }
    };

    // --- CRUD: Categories ---

    const addCategory = async (cat: Partial<Category>) => {
        const maxId = categories.value.reduce((max, c) => Math.max(max, c.id), 0);
        const newCat: Category = {
            id: maxId + 1,
            name: cat.name || '新分类',
            level: cat.level || 0
        };
        categories.value.push(newCat);
        try {
            await sync(`添加分类: ${newCat.name}`);
        } catch (e) {
            categories.value.pop(); // Revert
            throw e;
        }
    };

    const updateCategory = async (catData: Partial<Category>) => {
        if (!catData.id) return;
        const idx = categories.value.findIndex(c => c.id === catData.id);
        if (idx > -1) {
            const original = { ...categories.value[idx] };
            categories.value[idx] = { ...categories.value[idx], ...catData, id: Number(catData.id) };
            try {
                await sync(`更新分类: ${categories.value[idx].name}`);
            } catch (e) {
                categories.value[idx] = original; // Revert
                throw e;
            }
        }
    };

    const deleteCategory = async (id: number) => {
        const originalCats = [...categories.value];
        const originalItems = [...items.value];
        
        categories.value = categories.value.filter(c => c.id !== id);
        items.value = items.value.map(i => i.categoryId === id ? { ...i, categoryId: 0 } : i);
        
        try {
            await sync(`删除分类: ID ${id}`);
        } catch (e) {
            categories.value = originalCats; // Revert
            items.value = originalItems;
            throw e;
        }
    };

    const moveCategory = async (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= categories.value.length) return;
        const originalCats = [...categories.value];
        
        const arr = [...categories.value];
        const [moved] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, moved);
        categories.value = arr;
        
        try {
            await sync(`移动分类: ${moved.name}`);
        } catch (e) {
            categories.value = originalCats; // Revert
            throw e;
        }
    };

    // --- CRUD: Items ---

    const addItem = async (itemData: Partial<Item>) => {
        const maxId = items.value.reduce((max, i) => Math.max(max, i.id), 0);
        const newItem: Item = {
            id: maxId + 1,
            name: itemData.name || '未命名',
            url: itemData.url || '#',
            description: itemData.description || '',
            categoryId: Number(itemData.categoryId || 0),
            pinned: !!itemData.pinned,
            level: itemData.level || 0,
            tags: itemData.tags || []
        };
        items.value.push(newItem);
        
        try {
            await sync(`添加书签: ${newItem.name}`);
        } catch (e) {
            items.value.pop(); // Revert
            throw e;
        }
    };

    const updateItem = async (itemData: Partial<Item>) => {
        if (!itemData.id) return;
        const idx = items.value.findIndex(i => i.id === itemData.id);
        if (idx > -1) {
            const original = { ...items.value[idx] };
            
            const updatedItem = {
                ...items.value[idx],
                ...itemData,
                id: Number(itemData.id),
            };

            if (itemData.categoryId !== undefined) {
                updatedItem.categoryId = Number(itemData.categoryId);
            }

            items.value[idx] = updatedItem;
            
            try {
                await sync(`更新书签: ${updatedItem.name}`);
            } catch (e) {
                items.value[idx] = original; // Revert
                throw e;
            }
        }
    };

    const deleteItem = async (id: number) => {
        const originalItems = [...items.value];
        const item = items.value.find(i => i.id === id);
        items.value = items.value.filter(i => i.id !== id);
        
        try {
            await sync(`删除书签: ${item?.name || id}`);
        } catch (e) {
            items.value = originalItems; // Revert
            throw e;
        }
    };

    const batchDeleteItems = async (ids: number[]) => {
        const originalItems = [...items.value];
        items.value = items.value.filter(i => !ids.includes(i.id));
        
        try {
            await sync(`批量删除书签: ${ids.length}个`);
        } catch (e) {
            items.value = originalItems; // Revert
            throw e;
        }
    };

    const batchMoveItems = async (ids: number[], targetCatId: number) => {
        const originalItems = [...items.value];
        items.value = items.value.map(i => ids.includes(i.id) ? { ...i, categoryId: Number(targetCatId) } : i);
        
        try {
            await sync(`批量移动书签: ${ids.length}个`);
        } catch (e) {
            items.value = originalItems; // Revert
            throw e;
        }
    }

    /**
     * 移动书签并调整排序
     * @param itemId 书签 ID
     * @param targetCatId 目标分类 ID
     * @param targetIndex 目标分类内的索引位置
     */
    const moveItem = async (itemId: number, targetCatId: number, targetIndex: number) => {
        const sourceIdx = items.value.findIndex(i => i.id === itemId);
        if (sourceIdx === -1) return;

        const updatedItems = [...items.value];
        const [movedItem] = updatedItems.splice(sourceIdx, 1);
        movedItem.categoryId = Number(targetCatId);

        // 获取目标分类中现有的书签
        const targetCatItems = updatedItems.filter(i => i.categoryId === movedItem.categoryId);

        if (targetCatItems.length === 0) {
            // 目标分类为空，追加到末尾
            updatedItems.push(movedItem);
        } else if (targetIndex >= targetCatItems.length) {
            // 插入到该分类最后一个元素之后
            const lastItemOfCat = targetCatItems[targetCatItems.length - 1];
            const lastIdx = updatedItems.lastIndexOf(lastItemOfCat);
            updatedItems.splice(lastIdx + 1, 0, movedItem);
        } else {
            // 插入到目标参考元素之前
            const referenceItem = targetCatItems[targetIndex];
            const targetIdx = updatedItems.indexOf(referenceItem);
            updatedItems.splice(targetIdx, 0, movedItem);
        }

        items.value = updatedItems;
        await sync(`移动/排序书签: ${movedItem.name}`);
    };

    /**
     * 根据 URL 查找是否存在重复书签
     * @param url 书签地址
     * @param excludeId 排除的 ID (编辑时使用)
     * @returns 冲突的书签对象，若无则返回 null
     */
    const findDuplicateItem = (url: string, excludeId?: number) => {
        if (!url) return null;
        const targetUrl = url.trim().toLowerCase();

        return items.value.find(item => {
            if (excludeId !== undefined && item.id === excludeId) return false;

            // 执行大小写不敏感匹配，且去除首尾空格
            const itemUrl = (item.url || '').trim().toLowerCase();
            return itemUrl === targetUrl;
        }) || null;
    };

    return {
        // State
        categories,
        items,
        loading,
        saving,
        initialized,

        // Getters
        siteData,

        // Actions
        loadData,
        addCategory,
        updateCategory,
        deleteCategory,
        moveCategory,
        addItem,
        updateItem,
        deleteItem,
        batchDeleteItems,
        batchMoveItems,
        moveItem,
        findDuplicateItem
    };
});
