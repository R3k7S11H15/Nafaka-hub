export default {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
  multiGet: () => Promise.resolve([]),
  multiSet: () => Promise.resolve(),
  multiRemove: () => Promise.resolve(),
  flushGetRequests: () => Promise.resolve([]),
  getAllKeys: () => Promise.resolve([]),
  clear: () => Promise.resolve(),
}
