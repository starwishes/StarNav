<template>
  <section class="panel-card table-wrapper">
    <div class="card-header">
      <span class="card-title">{{ t('manage.categoryList') }}</span>
      <button type="button" class="action-button primary" @click="emit('add-category')">
        {{ t('manage.addCategory') }}
      </button>
    </div>
    <CategoryTable
      :categories="categories"
      :items="items"
      @edit="onEditCategory"
      @delete="onDeleteCategory"
      @move="onMoveCategory"
    />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CategoryTable from '@/components/CategoryTable.vue'
import type { Category, Item } from '@/types'

const { t } = useI18n()

defineProps<{
  categories: Category[]
  items: Item[]
}>()

const emit = defineEmits<{
  (e: 'add-category'): void
  (e: 'edit-category', category: Category): void
  (e: 'delete-category', category: Category): void
  (e: 'move-category', index: number, direction: 'up' | 'down'): void
}>()

const onEditCategory = (category: Category) => emit('edit-category', category)

const onDeleteCategory = (category: Category) => emit('delete-category', category)

const onMoveCategory = (index: number, direction: 'up' | 'down') =>
  emit('move-category', index, direction)
</script>

<style scoped lang="scss">
// 拆分子组件共享 .panel-card 样式与 @container data-manager 断点块：样式按需复制，改一处需同步另两处（Toolbar/CategoryPanel/ItemsPanel）。
.panel-card {
  padding: 20px;
  border-radius: 22px;
  border: 1px solid var(--data-card-border);
  background: var(--data-card-bg);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
}

.card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
  margin-bottom: 18px;
}

.card-title {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  color: var(--gray-800);
  font-size: 16px;
  font-weight: 700;
  flex: 0 1 auto;
}

.card-header > .action-button {
  flex: 0 0 auto;
  width: auto;
  margin-left: auto;
}

.action-button {
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--data-action-bg);
  color: var(--data-action-text);
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  flex: 0 0 auto;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--ui-theme-rgb), 0.25);
    outline-offset: 2px;
  }
}

.action-button.primary {
  background: linear-gradient(135deg, rgb(var(--ui-theme-rgb)), rgba(var(--ui-theme-rgb), 0.82));
  color: #fff;
}

// ---- Content-width breakpoints (sidebar-aware) ----

// Compact content pane: stack toolbar, keep list add-buttons compact
@container data-manager (max-width: 860px) {
  .card-header > .action-button {
    flex: 0 0 auto;
    width: auto;
    min-height: 40px;
    margin-left: auto;
  }
}

// Phone-narrow content: wrap more tightly, still keep add button pill-sized
@container data-manager (max-width: 520px) {
  .card-header {
    gap: 10px;
  }

  .card-header > .action-button {
    margin-left: auto;
    width: auto;
    max-width: 100%;
  }
}

// Fallback when container queries unsupported: viewport media
@supports not (container-type: inline-size) {
  @media (max-width: 1100px) {
    .card-header > .action-button {
      flex: 0 0 auto;
      width: auto;
      margin-left: auto;
    }
  }
}
</style>
