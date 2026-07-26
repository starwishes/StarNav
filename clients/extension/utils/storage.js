export function getStorage(keys, area = 'sync') {
  return new Promise((resolve, reject) => {
    chrome.storage[area].get(keys, (data) => {
      if (globalThis.chrome?.runtime?.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(data || {})
    })
  })
}

export function setStorage(data, area = 'sync') {
  return new Promise((resolve, reject) => {
    chrome.storage[area].set(data, () => {
      if (globalThis.chrome?.runtime?.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve()
    })
  })
}

export function removeStorage(keys, area = 'sync') {
  return new Promise((resolve, reject) => {
    chrome.storage[area].remove(keys, () => {
      if (globalThis.chrome?.runtime?.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve()
    })
  })
}

export async function getMergedStorage(keys) {
  const syncData = await getStorage(keys, 'sync')
  const localData = await getStorage(keys, 'local')
  return { ...syncData, ...localData }
}
