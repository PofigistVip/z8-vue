import { reactive, readonly } from 'vue'

function normalizeNavEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const text = typeof raw.text === 'string' ? raw.text : ''
  const request = typeof raw.request === 'string' ? raw.request : ''
  const id = raw.id === undefined || raw.id === null ? '' : String(raw.id)
  const childrenRaw = Array.isArray(raw.entries) ? raw.entries : []
  const entries = childrenRaw.map(normalizeNavEntry).filter(Boolean)
  return { text, request, id, entries }
}

function normalizeNavTree(list) {
  if (!Array.isArray(list)) return []
  return list.map(normalizeNavEntry).filter(Boolean)
}

const state = reactive({
  user: null,
  navEntries: [],
  loginError: null,
})

export function useUserStore() {
  return readonly(state)
}

export function applyLoginResponse(json) {
  state.loginError = null
  if (!json || json.success !== true) {
    state.user = null
    state.navEntries = []
    const msg =
      typeof json?.message === 'string'
        ? json.message
        : typeof json?.error === 'string'
          ? json.error
          : 'Login failed'
    state.loginError = msg
    return false
  }
  const user = json.user && typeof json.user === 'object' ? { ...json.user } : null
  state.user = user
  state.navEntries = normalizeNavTree(user?.entries)
  return true
}

export function clearUserStore() {
  state.user = null
  state.navEntries = []
  state.loginError = null
}

export function setUserStoreLoginError(message) {
  state.loginError = typeof message === 'string' ? message : String(message ?? '')
}
