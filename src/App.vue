<script setup>
import { ref } from 'vue'

import Z8View from './components/z8/Z8View.vue'
import { Z8Client } from './z8/z8Client.js'

const client = new Z8Client()

const activePage = ref(null) // 'readers' | null
const readersSpec = ref(null)
const loading = ref(false)
const error = ref(null)

async function openReaders() {
  activePage.value = 'readers'
  error.value = null

  if (readersSpec.value) return
  loading.value = true
  try {
    const res = await client.meta({
      request: 'ru.moscollector.control.module.cards.view.СчитывателиView',
      id: 'считывателиView',
      period: { start: null, finish: null },
    })
    readersSpec.value = res
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
    <aside class="w-60 shrink-0 border-r bg-white">
      <div class="border-b px-4 py-3">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Навигация</div>
      </div>

      <nav class="p-2">
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50"
          :class="activePage === 'readers' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'"
          :disabled="loading"
          @click="openReaders"
        >
          <span>Считыватели</span>
          <span v-if="loading" class="text-xs text-slate-500">...</span>
        </button>
      </nav>
    </aside>

    <main class="min-h-0 flex-1 overflow-hidden p-6">
      <div v-if="activePage !== 'readers'" class="flex h-full items-center justify-center">
        <div class="text-sm text-slate-600">Выберите раздел в меню слева.</div>
      </div>

      <div v-else class="h-full min-h-0">
        <div v-if="error" class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {{ error }}
        </div>

        <div v-if="!readersSpec && loading" class="flex h-full items-center justify-center">
          <div class="text-sm text-slate-600">Загрузка…</div>
        </div>

        <div v-else-if="readersSpec" class="h-full min-h-0">
          <Z8View :spec="readersSpec" />
        </div>
      </div>
    </main>
  </div>
</template>
