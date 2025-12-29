/**
 * StarNav Browser Extension - Options Script
 * Handles server configuration and authentication
 */

// DOM Elements
const elements = {
    serverUrl: document.getElementById('serverUrl'),
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    saveBtn: document.getElementById('saveBtn'),
    testBtn: document.getElementById('testBtn'),
    statusBox: document.getElementById('statusBox'),
    statusIcon: document.getElementById('statusIcon'),
    statusText: document.getElementById('statusText'),
    toast: document.getElementById('toast')
};

// State
let isConnected = false;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // 尝试加载预配置（从下载的 ZIP 包中的 config.js）
    if (typeof window.STARNAV_CONFIG !== 'undefined') {
        const config = window.STARNAV_CONFIG;

        // 如果有预配置的 token，自动保存并应用
        if (config.token) {
            console.log('[StarNav] 正在保存预配置到 storage...');
            await setStorage({
                serverUrl: config.serverUrl,
                token: config.token,
                user: config.user
            });
            showToast('已自动加载预配置', 'success');
        }
    }

    // Load saved config
    const stored = await getFullStorage(['serverUrl', 'token', 'user']);
    console.log('[StarNav] Storage 配置已载入');

    if (stored.serverUrl) {
        elements.serverUrl.value = stored.serverUrl;
    }

    if (stored.token) {
        isConnected = true;
        const username = stored.user?.login || stored.user?.name || '用户';
        updateStatus(true, `已连接 (${username})`);
        updateButtonState();
    }

    setupEventListeners();
}

function setupEventListeners() {
    elements.saveBtn.addEventListener('click', handleSaveClick);
    elements.testBtn.addEventListener('click', testConnection);
}

// Storage helpers - 混合存储支持 (Token 存 Local, 其他存 Sync)
function getStorage(keys, area = 'sync') {
    return new Promise(resolve => {
        chrome.storage[area].get(keys, resolve);
    });
}

async function getFullStorage(keys) {
    const syncData = await getStorage(keys, 'sync');
    const localData = await getStorage(keys, 'local');
    return { ...syncData, ...localData };
}

function setStorage(data, area = 'sync') {
    return new Promise(resolve => {
        chrome.storage[area].set(data, resolve);
    });
}

function clearStorage(keys, area = 'sync') {
    return new Promise(resolve => {
        chrome.storage[area].remove(keys, resolve);
    });
}

// UI Helpers
function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.style.display = 'block';
    setTimeout(() => {
        elements.toast.style.display = 'none';
    }, 3000);
}

function updateStatus(connected, text) {
    isConnected = connected;
    if (connected) {
        elements.statusBox.className = 'status connected';
        elements.statusIcon.textContent = '✅';
    } else {
        elements.statusBox.className = 'status disconnected';
        elements.statusIcon.textContent = '⚠️';
    }
    elements.statusText.textContent = text;
    updateButtonState();
}

function updateButtonState() {
    if (isConnected) {
        elements.saveBtn.textContent = '断开连接';
        elements.saveBtn.style.background = '#ef4444';
    } else {
        elements.saveBtn.textContent = '保存并连接';
        elements.saveBtn.style.background = '#6366f1';
    }
}

function setLoading(loading) {
    elements.saveBtn.disabled = loading;
    elements.testBtn.disabled = loading;
    if (loading) {
        elements.saveBtn.textContent = '连接中...';
    } else {
        updateButtonState();
    }
}

// API
async function login(serverUrl, username, password) {
    const response = await fetch(`${serverUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || '登录失败');
    }

    return data;
}

async function testHealth(serverUrl) {
    const response = await fetch(`${serverUrl}/api/health`);
    if (!response.ok) {
        throw new Error('服务器无法连接');
    }
    return await response.json();
}

// Actions
async function handleSaveClick() {
    if (isConnected) {
        // 断开连接
        await clearStorage(['token', 'user'], 'local');
        await clearStorage(['token', 'user'], 'sync'); // 清除旧位置以防万一
        elements.password.value = '';
        updateStatus(false, '已断开');
        showToast('已断开连接', 'success');
    } else {
        // 保存并连接
        await saveAndConnect();
    }
}

async function saveAndConnect() {
    const serverUrl = elements.serverUrl.value.trim().replace(/\/$/, '');
    const username = elements.username.value.trim();
    const password = elements.password.value;

    if (!serverUrl) {
        showToast('请输入服务器地址', 'error');
        return;
    }

    if (!username || !password) {
        showToast('请输入用户名和密码', 'error');
        return;
    }

    try {
        setLoading(true);

        // Attempt login
        const result = await login(serverUrl, username, password);

        if (!serverUrl.startsWith('https://') && !serverUrl.includes('localhost') && !serverUrl.includes('127.0.0.1')) {
            showToast('警告：非 HTTPS 连接可能存在安全风险', 'error');
        }

        // Save to storage (Token 存本地 local)
        await setStorage({ serverUrl }, 'sync');
        await setStorage({
            token: result.token,
            user: result.user
        }, 'local');

        updateStatus(true, `已连接 (${result.user?.login || username})`);
        showToast('连接成功！', 'success');

        // Clear password field
        elements.password.value = '';
    } catch (error) {
        updateStatus(false, '连接失败');
        showToast(error.message || '连接失败', 'error');
    } finally {
        setLoading(false);
    }
}

async function testConnection() {
    const serverUrl = elements.serverUrl.value.trim().replace(/\/$/, '');

    if (!serverUrl) {
        showToast('请输入服务器地址', 'error');
        return;
    }

    try {
        elements.testBtn.disabled = true;
        elements.testBtn.textContent = '测试中...';

        const health = await testHealth(serverUrl);
        showToast(`服务器正常 (v${health.version || '?'})`, 'success');
    } catch (error) {
        showToast('无法连接到服务器', 'error');
    } finally {
        elements.testBtn.disabled = false;
        elements.testBtn.textContent = '测试连接';
    }
}
