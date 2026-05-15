import { reactive, readonly } from 'vue'

const KNOWN_TYPES = new Set(['error', 'warning', 'info', 'success'])

const state = reactive({
  items: [],
})

const dismissTimers = new Map()

function nextId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeType(raw) {
  const t = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return KNOWN_TYPES.has(t) ? t : 'info'
}

function normalizeMessage(raw) {
  if (!raw || typeof raw !== 'object') return null
  const text = typeof raw.text === 'string' ? raw.text.trim() : ''
  if (!text) return null
  return {
    id: nextId(),
    text,
    source: typeof raw.source === 'string' ? raw.source.trim() : '',
    time: typeof raw.time === 'string' ? raw.time.trim() : '',
    type: normalizeType(raw.type),
  }
}

export function useZ8Messages() {
  return readonly(state)
}

export function pushInfoMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) return
  for (const raw of messages) {
    const msg = normalizeMessage(raw)
    if (msg) state.items.push(msg)
  }
}

export function dismissMessage(id) {
  const timer = dismissTimers.get(id)
  if (timer != null) {
    clearTimeout(timer)
    dismissTimers.delete(id)
  }
  const idx = state.items.findIndex((m) => m.id === id)
  if (idx >= 0) state.items.splice(idx, 1)
}

export function scheduleDismiss(id, durationMs) {
  const ms = Number(durationMs)
  if (!Number.isFinite(ms) || ms <= 0) return
  const existing = dismissTimers.get(id)
  if (existing != null) clearTimeout(existing)
  const timer = setTimeout(() => {
    dismissTimers.delete(id)
    dismissMessage(id)
  }, ms)
  dismissTimers.set(id, timer)
}
