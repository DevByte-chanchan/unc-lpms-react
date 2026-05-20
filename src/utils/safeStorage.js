const safeStorage = {
  getItem(key, fallback = null) {
    try {
      const value = localStorage.getItem(key)
      return value !== null ? value : fallback
    } catch (e) {
      console.warn('localStorage read failed for key:', key)
      return fallback
    }
  },

  setItem(key, value) {
    try {
      localStorage.setItem(key, value)
      return true
    } catch (e) {
      console.warn('localStorage write failed for key:', key)
      if (e.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded')
      }
      return false
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch (e) {
      console.warn('localStorage remove failed for key:', key)
      return false
    }
  },

  getJSON(key, fallback = null) {
    try {
      const value = this.getItem(key)
      return value ? JSON.parse(value) : fallback
    } catch (e) {
      console.warn('JSON parse failed for key:', key)
      return fallback
    }
  },

  setJSON(key, value) {
    try {
      return this.setItem(key, JSON.stringify(value))
    } catch (e) {
      return false
    }
  },

  clear() {
    try {
      localStorage.clear()
      return true
    } catch (e) {
      return false
    }
  }
}

export const getStorageItem = safeStorage.getItem
export const setStorageItem = safeStorage.setItem
export const removeStorageItem = safeStorage.removeItem
export const getJSON = safeStorage.getJSON
export const setJSON = safeStorage.setJSON

export default safeStorage
