let _storage = null

function initStorage() {
  if (_storage) return _storage

  if (typeof window !== 'undefined' && window.localStorage) {
    _storage = {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
      removeItem: (key) => window.localStorage.removeItem(key),
      clear: () => window.localStorage.clear(),
      keys: () => Object.keys(window.localStorage),
    }
  } else {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      _storage = {
        getItem: (key) => AsyncStorage.getItem(key),
        setItem: (key, value) => AsyncStorage.setItem(key, value),
        removeItem: (key) => AsyncStorage.removeItem(key),
        clear: () => AsyncStorage.clear(),
        keys: () => AsyncStorage.getAllKeys ? AsyncStorage.getAllKeys() : AsyncStorage.getAllKeys(),
      }
    } catch {
      const memoryStore = new Map()
      _storage = {
        getItem: (key) => memoryStore.get(key) ?? null,
        setItem: (key, value) => memoryStore.set(key, String(value)),
        removeItem: (key) => memoryStore.delete(key),
        clear: () => memoryStore.clear(),
        keys: () => Array.from(memoryStore.keys()),
      }
    }
  }
  return _storage
}

const storage = {
  getItem(key) { return initStorage().getItem(key) },
  setItem(key, value) { return initStorage().setItem(key, value) },
  removeItem(key) { return initStorage().removeItem(key) },
  clear() { return initStorage().clear() },
  keys() { return initStorage().keys() },
}

export default storage
