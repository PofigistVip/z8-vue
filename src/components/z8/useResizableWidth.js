import { ref } from 'vue'

function clamp(value, min, max) {
  if (typeof min === 'number') value = Math.max(min, value)
  if (typeof max === 'number') value = Math.min(max, value)
  return value
}

export function useResizableWidth(initial, options = {}) {
  const { min = 100, max } = options
  const width = ref(initial)

  function resolveMax() {
    if (typeof max === 'function') return max()
    return max
  }

  function applyDelta(dx) {
    if (!dx) return
    width.value = clamp(width.value + dx, min, resolveMax())
  }

  function setWidth(next) {
    width.value = clamp(next, min, resolveMax())
  }

  return { width, applyDelta, setWidth }
}
