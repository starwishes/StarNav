export function getStorage(keys, area = 'sync') {
  return new Promise((resolve) => chrome.storage[area].get(keys, resolve))
}

export function setStorage(data, area = 'sync') {
  return new Promise((resolve) => chrome.storage[area].set(data, resolve))
}
