import { reactive, readonly } from 'vue'

function jobFieldsFromRaw(raw) {
  return {
    isJob: raw.isJob === true,
    parameters: Array.isArray(raw.parameters) ? raw.parameters : [],
  }
}

function normalizeLegacyNavEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const text = typeof raw.text === 'string' ? raw.text : ''
  const request = typeof raw.request === 'string' ? raw.request : ''
  const id = raw.id === undefined || raw.id === null ? '' : String(raw.id)
  const childrenRaw = Array.isArray(raw.entries) ? raw.entries : []
  const entries = childrenRaw.map(normalizeLegacyNavEntry).filter(Boolean)
  return { text, request, id, entries, isGroup: false, ...jobFieldsFromRaw(raw) }
}

function normalizeLegacyNavTree(list) {
  if (!Array.isArray(list)) return []
  return list.map(normalizeLegacyNavEntry).filter(Boolean)
}

function normalizeMenuNode(raw) {
  if (!raw || typeof raw !== 'object') return null
  const text = typeof raw.text === 'string' ? raw.text : ''
  const request = typeof raw.request === 'string' ? raw.request.trim() : ''
  const id = raw.id === undefined || raw.id === null ? '' : String(raw.id)
  const itemsRaw = Array.isArray(raw.items) ? raw.items : []
  const entries = itemsRaw.map(normalizeMenuNode).filter(Boolean)
  const hasRequest = request.length > 0
  const hasChildren = entries.length > 0

  if (!hasRequest && !hasChildren) return null
  if (!hasRequest && hasChildren) {
    return { text, request: '', id: '', entries, isGroup: true, isJob: false, parameters: [] }
  }
  return { text, request, id, entries, isGroup: false, ...jobFieldsFromRaw(raw) }
}

function normalizeMenuData(rawList) {
  if (!Array.isArray(rawList)) return []
  return rawList.map(normalizeMenuNode).filter(Boolean)
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
  const fromData = normalizeMenuData(user?.data)
  state.navEntries =
    fromData.length > 0 ? fromData : normalizeLegacyNavTree(user?.entries)
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

export const MANAGER_DOCUMENTS_VIEW_REQUEST =
  'ru.ivk.homer.module.manager.view.РуководительДокументыView'

export function isAdminUser(user) {
  const login = typeof user?.login === 'string' ? user.login.trim() : ''
  return login.toLowerCase() === 'admin'
}

/** Рекурсивный поиск листа меню по request. */
export function findNavEntryByRequest(entries, request) {
  const target = typeof request === 'string' ? request.trim() : ''
  if (!target || !Array.isArray(entries)) return null

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const req = typeof entry.request === 'string' ? entry.request.trim() : ''
    if (req === target) return entry
    const children = Array.isArray(entry.entries) ? entry.entries : []
    const found = findNavEntryByRequest(children, target)
    if (found) return found
  }
  return null
}

/** Стабильный ключ листа меню (совпадает с NavEntry для пунктов с request). */
export function menuLeafKey(entry) {
  if (!entry || typeof entry.request !== 'string' || !entry.request.trim()) return ''
  return `${entry.request}\u0000${entry.id ?? ''}`
}
