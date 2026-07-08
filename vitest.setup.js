// Minimal in-memory localStorage for the node test environment.
class MemoryStorage {
  constructor() {
    this.store = new Map()
  }
  getItem(k) {
    return this.store.has(k) ? this.store.get(k) : null
  }
  setItem(k, v) {
    this.store.set(k, String(v))
  }
  removeItem(k) {
    this.store.delete(k)
  }
  clear() {
    this.store.clear()
  }
}

globalThis.localStorage = new MemoryStorage()
