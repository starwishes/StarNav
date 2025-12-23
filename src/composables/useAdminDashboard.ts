import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAdminStore } from '@/store/admin';
import { Category, Item } from '@/types';

export function useAdminDashboard() {
  const adminStore = useAdminStore();

  const loading = ref(false);
  const saving = ref(false);
  const activeTab = ref('categories');

  // 数据
  const categories = ref<Category[]>([]);
  const items = ref<Item[]>([]);

  // 筛选
  const filterCategory = ref(0);
  const searchKeyword = ref('');

  // 对话框
  const categoryDialogVisible = ref(false);
  const itemDialogVisible = ref(false);
  const isEdit = ref(false);

  // 表单
  const categoryForm = ref<Partial<Category>>({});
  const itemForm = ref<Partial<Item>>({});

  // 计算属性
  const filteredItems = computed(() => {
    let result = items.value;

    // 按分类筛选
    if (filterCategory.value !== 0) {
      result = result.filter((item: Item) => item.categoryId === filterCategory.value);
    }

    // 按关键词搜索
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.toLowerCase().trim();
      result = result.filter((item: Item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.url.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword)
      );
    }

    return result;
  });

  // 加载数据
  const loadData = async () => {
    loading.value = true;
    try {
      const data = await adminStore.getFileContent();
      categories.value = data.content.categories;
      items.value = data.content.items;
      ElMessage.success('数据加载成功');
    } catch (error: any) {
      ElMessage.error(error.message || '加载数据失败');
    } finally {
      loading.value = false;
    }
  };

  // 保存数据
  const handleSave = async () => {
    try {
      await ElMessageBox.confirm(
        '确定要保存修改吗？',
        '确认操作',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );

      saving.value = true;

      const content = {
        categories: categories.value,
        items: items.value,
      };

      await adminStore.updateFileContent(content);

      ElMessage.success('保存成功');

      // 重新加载数据
      await loadData();
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '保存失败');
      }
    } finally {
      saving.value = false;
    }
  };

  // 分类操作
  const handleAddCategory = () => {
    isEdit.value = false;
    categoryForm.value = {
      id: Math.max(...categories.value.map((c: Category) => c.id), 0) + 1,
      name: '',
      private: false,
    };
    categoryDialogVisible.value = true;
  };

  const handleEditCategory = (row: Category) => {
    isEdit.value = true;
    categoryForm.value = { ...row };
    categoryDialogVisible.value = true;
  };

  const getItemCountByCategory = (categoryId: number) => {
    return items.value.filter((item: Item) => item.categoryId === categoryId).length;
  };

  const handleDeleteCategory = async (row: Category) => {
    try {
      const count = getItemCountByCategory(row.id);
      if (count > 0) {
        ElMessage.warning(`该分类下还有 ${count} 个网站，请先删除网站`);
        return;
      }

      await ElMessageBox.confirm(
        `确定要删除分类「${row.name}」吗？`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );

      categories.value = categories.value.filter((cat: Category) => cat.id !== row.id);
      ElMessage.success('删除成功');
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败');
      }
    }
  };

  const saveCategory = () => {
    if (!categoryForm.value.name) {
      ElMessage.warning('请输入分类名称');
      return;
    }

    if (isEdit.value) {
      const index = categories.value.findIndex((cat: Category) => cat.id === categoryForm.value.id);
      if (index !== -1) {
        categories.value[index] = categoryForm.value as Category;
      }
    } else {
      categories.value.push(categoryForm.value as Category);
    }

    categoryDialogVisible.value = false;
    ElMessage.success(isEdit.value ? '编辑成功' : '添加成功');
  };

  // 网站操作
  const handleAddItem = () => {
    isEdit.value = false;
    itemForm.value = {
      id: Math.max(...items.value.map((i: Item) => i.id), 0) + 1,
      name: '',
      url: '',
      description: '',
      categoryId: categories.value[0]?.id || 1,
      private: false,
    };
    itemDialogVisible.value = true;
  };

  const handleEditItem = (row: Item) => {
    isEdit.value = true;
    itemForm.value = { ...row };
    itemDialogVisible.value = true;
  };

  const handleDeleteItem = async (row: Item) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除网站「${row.name}」吗？`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );

      items.value = items.value.filter((item: Item) => item.id !== row.id);
      ElMessage.success('删除成功');
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败');
      }
    }
  };

  const saveItem = () => {
    if (!itemForm.value.name || !itemForm.value.url || !itemForm.value.categoryId) {
      ElMessage.warning('请填写完整信息');
      return;
    }

    if (isEdit.value) {
      const index = items.value.findIndex((item: Item) => item.id === itemForm.value.id);
      if (index !== -1) {
        items.value[index] = itemForm.value as Item;
      }
    } else {
      items.value.push(itemForm.value as Item);
    }

    itemDialogVisible.value = false;
    ElMessage.success(isEdit.value ? '编辑成功' : '添加成功');
  };

  return {
    loading,
    saving,
    activeTab,
    categories,
    items,
    filterCategory,
    searchKeyword,
    categoryDialogVisible,
    itemDialogVisible,
    isEdit,
    categoryForm,
    itemForm,
    filteredItems,
    loadData,
    handleSave,
    handleAddCategory,
    handleEditCategory,
    handleDeleteCategory,
    saveCategory,
    handleAddItem,
    handleEditItem,
    handleDeleteItem,
    saveItem,
  };
}
