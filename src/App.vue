<script setup>
import { computed, provide, ref } from 'vue'

import NavEntry from './components/NavEntry.vue'
import Z8MessageToasts from './components/Z8MessageToasts.vue'
import Z8View from './components/z8/Z8View.vue'
import {
  applyLoginResponse,
  clearUserStore,
  menuLeafKey,
  useUserStore,
} from './stores/userStore.js'
import { Z8Client } from './z8/z8Client.js'

const client = new Z8Client()
provide('z8Client', client)

const userStore = useUserStore()
const authenticated = computed(() => Boolean(userStore.user))

const loginName = ref('')
const loginPassword = ref('')
const loginSubmitting = ref(false)
const loginFormError = ref(null)

const activeNavKey = ref('')
const activeSpec = ref(null)
const activeViewRequest = ref('')
const activeViewId = ref('')
const loading = ref(false)
const error = ref(null)

function metaIdForEntry(entry) {
  const id = String(entry.id ?? '').trim()
  if (id) return id
  if (entry.request?.includes('СчитывателиView')) return 'считывателиView'
  return ''
}

async function submitLogin() {
  loginFormError.value = null
  const name = loginName.value.trim()
  if (!name) {
    loginFormError.value = 'Введите логин.'
    return
  }
  loginSubmitting.value = true
  try {
    const res = await client.login({
      login: name,
      password: loginPassword.value,
    })
    client.setSession(res.session)
    applyLoginResponse(res)
    loginPassword.value = ''
    activeNavKey.value = ''
    activeSpec.value = null
    activeViewRequest.value = ''
    activeViewId.value = ''
  } catch (e) {
    loginFormError.value = e instanceof Error ? e.message : String(e)
    clearUserStore()
    client.setSession(null)
  } finally {
    loginSubmitting.value = false
  }
}

function logout() {
  clearUserStore()
  client.setSession(null)
  activeNavKey.value = ''
  activeSpec.value = null
  activeViewRequest.value = ''
  activeViewId.value = ''
  error.value = null
}

async function openNavEntry(entry) {
  if (!entry?.request?.trim()) return
  activeNavKey.value = menuLeafKey(entry)
  activeViewRequest.value = entry.request
  activeViewId.value = entry.id ?? ''
  error.value = null
  loading.value = true
  try {
    const id = metaIdForEntry(entry)
    const res = await client.meta({
      request: entry.request,
      ...(id ? { id } : {}),
      period: { start: null, finish: null },
    })
    activeSpec.value = res
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    activeSpec.value = null
  } finally {
    loading.value = false
  }
}

const userLabel = computed(() => {
  const u = userStore.user
  if (!u) return ''
  const parts = [u.lastName, u.firstName, u.middleName].filter(Boolean)
  if (parts.length) return parts.join(' ')
  return u.login ?? ''
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
    <Z8MessageToasts />
    <template v-if="!authenticated">
      <main class="flex min-h-0 flex-1 items-center justify-center p-6">
        <form
          class="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm"
          @submit.prevent="submitLogin"
        >
          <h1 class="mb-1 text-lg font-semibold text-slate-900">Вход</h1>
          <p class="mb-4 text-sm text-slate-600">Z8</p>

          <label class="mb-3 block">
            <span class="mb-1 block text-xs font-medium text-slate-600">Логин</span>
            <input
              v-model="loginName"
              type="text"
              autocomplete="username"
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              :disabled="loginSubmitting"
            />
          </label>

          <label class="mb-4 block">
            <span class="mb-1 block text-xs font-medium text-slate-600">Пароль</span>
            <input
              v-model="loginPassword"
              type="password"
              autocomplete="current-password"
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              :disabled="loginSubmitting"
            />
          </label>

          <div
            v-if="loginFormError"
            class="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800"
          >
            {{ loginFormError }}
          </div>

          <button
            type="submit"
            class="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            :disabled="loginSubmitting"
          >
            {{ loginSubmitting ? 'Вход…' : 'Войти' }}
          </button>
        </form>
      </main>
    </template>

    <template v-else>
      <aside class="flex w-60 shrink-0 flex-col border-r bg-white">
        <div class="shrink-0 border-b px-4 py-3">
          <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Навигация</div>
          <div v-if="userLabel" class="mt-1 truncate text-sm font-medium text-slate-800">
            {{ userLabel }}
          </div>
          <button
            type="button"
            class="mt-2 text-xs text-slate-500 underline hover:text-slate-800"
            @click="logout"
          >
            Выйти
          </button>
        </div>

        <nav class="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <NavEntry
            :entries="userStore.navEntries"
            :active-key="activeNavKey"
            class="flex min-h-0 min-w-0 flex-1"
            @select="openNavEntry"
          />
        </nav>
      </aside>

      <main class="min-h-0 flex-1 overflow-hidden p-6">
        <div v-if="!activeSpec && !loading" class="flex h-full items-center justify-center">
          <div class="text-sm text-slate-600">Выберите раздел в меню слева.</div>
        </div>

        <div v-else class="h-full min-h-0">
          <div v-if="error" class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {{ error }}
          </div>

          <div v-if="loading" class="flex h-full items-center justify-center">
            <div class="text-sm text-slate-600">Загрузка…</div>
          </div>

          <div v-else-if="activeSpec" class="h-full min-h-0">
            <Z8View
              :spec="activeSpec"
              :view-request="activeViewRequest"
              :view-id="activeViewId"
            />
          </div>
        </div>
      </main>
    </template>
  </div>
</template>
