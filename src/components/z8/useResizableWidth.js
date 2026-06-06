import { ref, watch } from 'vue'

function clamp(value, min, max) {
  if (typeof min === 'number') value = Math.max(min, value)
  if (typeof max === 'number') value = Math.min(max, value)
  return value
}

function readStoredWidth(key) {
  if (!key || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    const value = Number(raw)
    if (!Number.isFinite(value)) return null
    return value
  } catch {
    return null
  }
}

function writeStoredWidth(key, value) {
  if (!key || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // private mode, quota exceeded, etc.
  }
}

export function useResizableWidth(initial, options = {}) {
  const { min = 100, max, storageKey, deferStorageRestore = false } = options
  const isRestored = ref(false)
  const canPersist = ref(Boolean(storageKey && !deferStorageRestore))

  function resolveMax() {
    if (typeof max === 'function') return max()
    return max
  }

  function enablePersist() {
    if (storageKey) canPersist.value = true
  }

  const stored = storageKey && !deferStorageRestore ? readStoredWidth(storageKey) : null
  const width = ref(
    stored === null ? initial : clamp(stored, min, resolveMax())
  )
  if (stored !== null) {
    isRestored.value = true
  }

  if (storageKey) {
    watch(width, (value) => {
      if (!canPersist.value) return
      writeStoredWidth(storageKey, value)
    })
  }

  function applyStoredWidth() {
    if (!storageKey) return false
    const value = readStoredWidth(storageKey)
    if (value === null) {
      enablePersist()
      return false
    }
    width.value = clamp(value, min, resolveMax())
    isRestored.value = true
    enablePersist()
    return true
  }

  function applyDelta(dx) {
    if (!dx) return
    width.value = clamp(width.value + dx, min, resolveMax())
    enablePersist()
  }

  function setWidth(next) {
    width.value = clamp(next, min, resolveMax())
    enablePersist()
  }

  return { width, applyDelta, setWidth, isRestored, applyStoredWidth }
}
