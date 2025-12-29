import { normalizeUrl } from '../utils/url.js';

/**
 * StarNav Browser Extension - Popup Script
 */

const elements = {
    notConnected: document.getElementById('notConnected'),
    mainContent: document.getElementById('mainContent'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    searchResults: document.getElementById('searchResults'),
    bookmarkList: document.getElementById('bookmarkList'),
    recentBookmarks: document.getElementById('recentBookmarks'),
    addSection: document.getElementById('addSection'),
    addCurrentBtn: document.getElementById('addCurrentBtn'),
    addForm: document.getElementById('addForm'),
    cancelAdd: document.getElementById('cancelAdd'),
    bookmarkName: document.getElementById('bookmarkName'),
    bookmarkUrl: document.getElementById('bookmarkUrl'),
    bookmarkCategory: document.getElementById('bookmarkCategory'),
    bookmarkLevel: document.getElementById('bookmarkLevel'),
    bookmarkDesc: document.getElementById('bookmarkDesc'),
    submitBookmark: document.getElementById('submitBookmark'),
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    categoryModal: document.getElementById('categoryModal'),
    closeCategoryModal: document.getElementById('closeCategoryModal'),
    newCategoryName: document.getElementById('newCategoryName'),
    newCategoryLevel: document.getElementById('newCategoryLevel'),
    submitCategory: document.getElementById('submitCategory'),
    duplicateWarning: document.getElementById('duplicateWarning'),
    duplicateName: document.getElementById('duplicateName'),
    openSite: document.getElementById('openSite'),
    openSettings: document.getElementById('openSettings'),
    i18nToggle: document.getElementById('i18nToggle'),
    goToSettings: document.getElementById('goToSettings'),
    loading: document.getElementById('loading'),
    toast: document.getElementById('toast')
};

const i18n = {
    zh: {
        openSite: "打开导航站",
        settings: "设置",
        toggleLang: "切换语言",
        notConnectedTip: "请先配置服务器地址",
        goToSettings: "前往设置",
        addCurrent: "➕ 添加当前页面",
        searchPlaceholder: "🔍 搜索书签...",
        recentVisit: "最近访问",
        addBookmark: "添加书签",
        urlStored: "该网址已收藏：",
        name: "名称",
        url: "网址",
        category: "分类",
        level: "可见等级",
        level0: "游客可见",
        level1: "注册用户",
        level2: "VIP 用户",
        level3: "仅管理员",
        description: "描述 (可选)",
        descPlaceholder: "简短描述...",
        save: "保存",
        newCategory: "新建分类",
        categoryName: "分类名称",
        catPlaceholder: "输入分类名称",
        create: "创建",
        noResults: "暂无书签",
        loadFailed: "加载失败",
        noMatch: "未找到匹配的书签",
        searchResult: "搜索结果",
        webOnly: "只能添加网页，请切换到普通网页后重试",
        duplicateAlert: "该页面已收藏，无法重复添加",
        infoFetchFailed: "无法获取当前页面信息",
        fillRequired: "请填写必要信息",
        addSuccess: "书签添加成功",
        addFailed: "添加失败",
        duplicateIn: "已存在于",
        catAddSuccess: "分类创建成功",
        catAddFailed: "创建失败",
        newCatTip: "新建分类"
    },
    en: {
        openSite: "Open StarNav",
        settings: "Settings",
        toggleLang: "Switch Language",
        notConnectedTip: "Please configure server address first",
        goToSettings: "Go to Settings",
        addCurrent: "➕ Add Current Page",
        searchPlaceholder: "🔍 Search bookmarks...",
        recentVisit: "Recent visits",
        addBookmark: "Add Bookmark",
        urlStored: "URL already stored: ",
        name: "Name",
        url: "URL",
        category: "Category",
        level: "Visibility",
        level0: "Guest",
        level1: "User",
        level2: "VIP",
        level3: "Admin Only",
        description: "Description (Optional)",
        descPlaceholder: "Short description...",
        save: "Save",
        newCategory: "New Category",
        categoryName: "Category Name",
        catPlaceholder: "Enter category name",
        create: "Create",
        noResults: "No bookmarks",
        loadFailed: "Failed to load",
        noMatch: "No matching bookmarks",
        searchResult: "Search results",
        webOnly: "Webpages only. Please switch tabs and try again.",
        duplicateAlert: "URL already exists, cannot add duplicate",
        infoFetchFailed: "Failed to fetch page info",
        fillRequired: "Please fill in required fields",
        addSuccess: "Bookmark added successfully",
        addFailed: "Failed to add",
        duplicateIn: "Already exists in",
        catAddSuccess: "Category created successfully",
        catAddFailed: "Failed to create",
        newCatTip: "New Category"
    }
};

let currentLang = 'zh';
let config = { serverUrl: '', token: '' };
let categories = [];
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // 始终绑定设置按钮事件（无论是否已连接）
    elements.openSettings.addEventListener('click', openOptionsPage);
    if (elements.goToSettings) elements.goToSettings.addEventListener('click', openOptionsPage);
    if (elements.i18nToggle) elements.i18nToggle.addEventListener('click', toggleLanguage);

    const stored = await getFullStorage(['serverUrl', 'token', 'lang']);
    config.serverUrl = stored.serverUrl || '';
    config.token = stored.token || '';
    currentLang = stored.lang || 'zh';

    updateUI();

    if (!config.serverUrl || !config.token) {
        showNotConnected();
        return;
    }

    showMainContent();
    await loadCategories();
    await loadRecentBookmarks();
    setupEventListeners();
}

function updateUI() {
    const texts = i18n[currentLang];

    // 遍历带有 data-i18n 的元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[key]) {
            // 保留图标内容
            if (el.tagName === 'BUTTON' && el.textContent.includes('➕')) {
                el.innerHTML = `➕ ${texts[key].replace('➕ ', '')}`;
            } else if (el.tagName === 'BUTTON' && el.textContent.includes('🔍')) {
                el.innerHTML = `🔍 ${texts[key].replace('🔍 ', '')}`;
            } else {
                el.textContent = texts[key];
            }
        }
    });

    // 更新特定的标题和 placeholder
    elements.openSite.title = texts.openSite;
    elements.openSettings.title = texts.settings;
    if (elements.i18nToggle) {
        elements.i18nToggle.title = texts.toggleLang;
        const main = elements.i18nToggle.querySelector('.main-char');
        const badge = elements.i18nToggle.querySelector('.badge-char');
        if (main && badge) {
            main.textContent = currentLang === 'zh' ? '文' : 'A';
            badge.textContent = currentLang === 'zh' ? 'A' : '文';
        }
    }
    if (elements.addCategoryBtn) elements.addCategoryBtn.title = texts.newCatTip;

    elements.searchInput.placeholder = texts.searchPlaceholder;
    elements.bookmarkDesc.placeholder = texts.descPlaceholder;
    elements.newCategoryName.placeholder = texts.catPlaceholder;
}

async function toggleLanguage() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    await setStorage({ lang: currentLang });
    updateUI();
}

function setupEventListeners() {
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.clearSearch.addEventListener('click', clearSearch);
    elements.addCurrentBtn.addEventListener('click', showAddForm);
    elements.cancelAdd.addEventListener('click', hideAddForm);
    elements.submitBookmark.addEventListener('click', submitBookmark);
    elements.openSite.addEventListener('click', () => chrome.tabs.create({ url: config.serverUrl }));

    // 新建分类事件
    if (elements.addCategoryBtn) elements.addCategoryBtn.addEventListener('click', showCategoryModal);
    if (elements.closeCategoryModal) elements.closeCategoryModal.addEventListener('click', hideCategoryModal);
    if (elements.submitCategory) elements.submitCategory.addEventListener('click', createCategory);
}

// Storage helpers - 混合存储支持
function getStorage(keys, area = 'sync') { return new Promise(r => chrome.storage[area].get(keys, r)); }

async function getFullStorage(keys) {
    const syncData = await getStorage(keys, 'sync');
    const localData = await getStorage(keys, 'local');
    return { ...syncData, ...localData };
}

function setStorage(data, area = 'sync') { return new Promise(r => chrome.storage[area].set(data, r)); }

function showNotConnected() { elements.notConnected.style.display = 'flex'; elements.mainContent.style.display = 'none'; }
function showMainContent() { elements.notConnected.style.display = 'none'; elements.mainContent.style.display = 'block'; }
function showLoading() { elements.loading.style.display = 'flex'; }
function hideLoading() { elements.loading.style.display = 'none'; }

function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.style.display = 'block';
    setTimeout(() => { elements.toast.style.display = 'none'; }, 3000);
}

function openOptionsPage() {
    if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
    else window.open(chrome.runtime.getURL('options/options.html'));
}

async function apiRequest(endpoint, options = {}) {
    const url = `${config.serverUrl}/api${endpoint}`;
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.token}` };
    try {
        const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
    } catch (error) { throw error; }
}

async function loadCategories() {
    try {
        const result = await apiRequest('/categories/simple');
        // 后端返回 { success: true, categories: [...] }
        categories = result.categories || result.data?.categories || [];
        elements.bookmarkCategory.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (error) { console.error('Failed to load categories:', error); }
}

async function loadRecentBookmarks() {
    try {
        showLoading();
        const result = await apiRequest('/bookmark/search?limit=10');
        // 后端返回 { success: true, items: [...] }
        const items = result.items || result.data?.items || [];
        if (items.length === 0) {
            elements.recentBookmarks.innerHTML = `<div class="no-results">${i18n[currentLang].noResults}</div>`;
        } else {
            renderBookmarkList(elements.recentBookmarks, items);
        }
    } catch (error) {
        elements.recentBookmarks.innerHTML = `<div class="no-results">${i18n[currentLang].loadFailed}</div>`;
    } finally { hideLoading(); }
}

function handleSearchInput(e) {
    const query = e.target.value.trim();
    elements.clearSearch.style.display = query ? 'block' : 'none';
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { query ? performSearch(query) : hideSearchResults(); }, 300);
}

function clearSearch() { elements.searchInput.value = ''; elements.clearSearch.style.display = 'none'; hideSearchResults(); }
function hideSearchResults() { elements.searchResults.style.display = 'none'; elements.bookmarkList.style.display = 'block'; elements.addSection.style.display = 'block'; }

async function performSearch(query) {
    try {
        const result = await apiRequest(`/bookmark/search?q=${encodeURIComponent(query)}&limit=15`);
        const items = result.data?.items || [];
        elements.bookmarkList.style.display = 'none';
        elements.addSection.style.display = 'none';
        elements.searchResults.style.display = 'block';
        if (items.length === 0) {
            elements.searchResults.innerHTML = `<div class="no-results">${i18n[currentLang].noMatch}</div>`;
        } else {
            elements.searchResults.innerHTML = `<div class="section-title">${i18n[currentLang].searchResult}</div><div class="bookmark-items"></div>`;
            renderBookmarkList(elements.searchResults.querySelector('.bookmark-items'), items);
        }
    } catch (error) { elements.searchResults.innerHTML = `<div class="no-results">${i18n[currentLang].loadFailed}</div>`; }
}

function renderBookmarkList(container, items) {
    container.innerHTML = items.map(item => `
    <a href="${escapeHtml(item.url)}" class="bookmark-item" target="_blank" rel="noopener">
      <div class="bookmark-icon">${(item.name || '?').charAt(0).toUpperCase()}</div>
      <div class="bookmark-info">
        <div class="bookmark-name">${escapeHtml(item.name)}</div>
        <div class="bookmark-url">${escapeHtml(item.url)}</div>
      </div>
      <span class="bookmark-category">${escapeHtml(item.categoryName || '')}</span>
    </a>
  `).join('');
}

function escapeHtml(str) { if (!str) return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

async function showAddForm() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        const url = tab.url;

        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
            showToast(i18n[currentLang].webOnly, 'error');
            return;
        }

        // 检查是否已收藏
        showLoading();
        try {
            const checkResult = await apiRequest(`/bookmark/check?url=${encodeURIComponent(url)}`);
            if (checkResult.exists) {
                elements.duplicateWarning.style.display = 'flex';
                elements.duplicateName.textContent = checkResult.item.name;
                // 填充已有信息并高亮
                elements.bookmarkName.value = checkResult.item.name;
                elements.bookmarkDesc.value = checkResult.item.description || '';
                elements.bookmarkCategory.value = checkResult.item.categoryId;
                elements.bookmarkLevel.value = checkResult.item.level || 0;
                showToast(i18n[currentLang].duplicateAlert, 'error');
            } else {
                elements.duplicateWarning.style.display = 'none';
                elements.bookmarkName.value = tab.title || '';
                elements.bookmarkDesc.value = '';
            }
        } catch (err) {
            console.error('Check bookmark error:', err);
            elements.bookmarkName.value = tab.title || '';
            elements.duplicateWarning.style.display = 'none';
        } finally {
            hideLoading();
        }

        elements.bookmarkUrl.value = url;
        elements.addSection.style.display = 'none';
        elements.bookmarkList.style.display = 'none';
        elements.searchResults.style.display = 'none';
        elements.addForm.style.display = 'block';
    } catch (error) {
        console.error('showAddForm error:', error);
        showToast(i18n[currentLang].infoFetchFailed, 'error');
    }
}

function hideAddForm() { elements.addForm.style.display = 'none'; elements.addSection.style.display = 'block'; elements.bookmarkList.style.display = 'block'; }

async function submitBookmark() {
    const name = elements.bookmarkName.value.trim();
    // 再次规范化，防止用户手动修改出问题
    const url = normalizeUrl(elements.bookmarkUrl.value.trim());
    const categoryId = elements.bookmarkCategory.value;
    const description = elements.bookmarkDesc.value.trim();
    const minLevel = parseInt(elements.bookmarkLevel?.value || '0', 10);

    if (!url) { showToast('URL Invalid', 'error'); return; }
    if (!name || !categoryId) { showToast(i18n[currentLang].fillRequired, 'error'); return; }
    try {
        elements.submitBookmark.disabled = true;
        showLoading();

        // 最终查重检查
        const checkResult = await apiRequest(`/bookmark/check?url=${encodeURIComponent(url)}`);
        if (checkResult.exists) {
            const cat = categories.find(c => String(c.id) === String(checkResult.item.categoryId));
            const catName = cat ? cat.name : (i18n[currentLang].loadFailed.includes('Failed') ? 'Unknown' : '未知分类');

            showToast(`${i18n[currentLang].addFailed}: ${i18n[currentLang].duplicateIn} "${catName}"`, 'error');
            elements.duplicateWarning.style.display = 'flex';
            elements.duplicateName.textContent = `${checkResult.item.name} (${i18n[currentLang].category}: ${catName})`;
            return; // 强制拦截
        }

        await apiRequest('/bookmark', { method: 'POST', body: JSON.stringify({ name, url, categoryId, description, minLevel }) });
        showToast(i18n[currentLang].addSuccess, 'success');
        hideAddForm();
        await loadRecentBookmarks();
    } catch (error) { showToast(error.message || i18n[currentLang].addFailed, 'error'); }
    finally { elements.submitBookmark.disabled = false; hideLoading(); }
}

// 新建分类相关函数
function showCategoryModal() {
    if (elements.categoryModal) {
        elements.newCategoryName.value = '';
        elements.categoryModal.style.display = 'flex';
    }
}

function hideCategoryModal() {
    if (elements.categoryModal) {
        elements.categoryModal.style.display = 'none';
    }
}

async function createCategory() {
    const name = elements.newCategoryName?.value.trim();
    const minLevel = parseInt(elements.newCategoryLevel?.value || '0', 10);
    if (!name) { showToast(i18n[currentLang].fillRequired, 'error'); return; }
    try {
        elements.submitCategory.disabled = true;
        const result = await apiRequest('/category', { method: 'POST', body: JSON.stringify({ name, minLevel }) });
        showToast(i18n[currentLang].catAddSuccess, 'success');
        hideCategoryModal();
        // 重新加载分类并选中新建的分类
        await loadCategories();
        const newCat = result.category || result.data?.category;
        if (newCat?.id && elements.bookmarkCategory) {
            elements.bookmarkCategory.value = newCat.id;
        }
    } catch (error) { showToast(error.message || i18n[currentLang].catAddFailed, 'error'); }
    finally { elements.submitCategory.disabled = false; }
}
