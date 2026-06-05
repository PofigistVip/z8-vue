<script setup>
import { inject, nextTick, onMounted, ref } from 'vue'

import Z8View from '../components/z8/Z8View.vue'
import ManagerFilePreviewForm from './ManagerFilePreviewForm.vue'
import { Z8Client } from '../z8/z8Client.js'
import { formatZ8UnixCellValue } from '../z8/z8Format.js'

const SECTIONS_REQUEST =
  'ru.ivk.homer.module.manager.view.РуководительРазделыДокументовView'

const props = defineProps({
  spec: { type: Object, required: true },
  viewRequest: { type: String, required: true },
  viewId: { type: String, default: '' },
})

const injectedClient = inject('z8Client', null)
const client = injectedClient instanceof Z8Client ? injectedClient : new Z8Client()

const z8ViewRef = ref(null)
const sections = ref([])
const sectionsLoading = ref(false)
const sectionsError = ref(null)
const selectedSectionKey = ref('')
const selectedSectionId = ref(null)

function sectionKey(row, index) {
  const id = row?.recordId
  if (id !== undefined && id !== null && String(id).length > 0) {
    return String(id)
  }
  return `idx:${index}`
}

function sectionLabel(row) {
  const text = row?.text
  if (typeof text === 'string' && text.trim()) return text.trim()
  return '—'
}

function sectionCount(row) {
  const raw = row?.count
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (raw !== undefined && raw !== null && String(raw).length > 0) return String(raw)
  return ''
}

function listBeforeRequest(method, payload) {
  const id = selectedSectionId.value
  if (!id) return
  if (method === 'read' || method === 'count') {
    payload.section = id
  }
}

function applySectionSelection(row, index) {
  selectedSectionKey.value = sectionKey(row, index)
  const rid = row?.recordId
  selectedSectionId.value =
    rid !== undefined && rid !== null && String(rid).length > 0 ? String(rid) : null
}

async function reloadMainList() {
  await nextTick()
  await z8ViewRef.value?.reloadMainList?.()
}

function selectSection(row, index) {
  applySectionSelection(row, index)
  void reloadMainList()
}

async function loadSections() {
  sectionsLoading.value = true
  sectionsError.value = null
  try {
    const res = await client.read({
      request: SECTIONS_REQUEST,
      fields: ['text', 'count'],
      limit: 500,
      period: { start: null, finish: null },
    })
    const rows = Array.isArray(res?.data) ? res.data : []
    sections.value = rows
    if (rows.length > 0) {
      applySectionSelection(rows[0], 0)
      await reloadMainList()
    } else {
      selectedSectionKey.value = ''
      selectedSectionId.value = null
    }
  } catch (e) {
    sections.value = []
    selectedSectionKey.value = ''
    selectedSectionId.value = null
    sectionsError.value = e instanceof Error ? e.message : String(e)
  } finally {
    sectionsLoading.value = false
  }
}

onMounted(() => {
  void loadSections()
})
</script>

<template>
  <div class="flex h-full min-h-0 gap-4">
    <aside
      class="flex w-56 shrink-0 min-h-0 flex-col rounded-lg border border-slate-200 bg-white"
    >
      <div class="shrink-0 border-b px-3 py-2">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Разделы
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-2">
        <div
          v-if="sectionsLoading"
          class="px-2 py-3 text-sm text-slate-600"
        >
          Загрузка…
        </div>

        <div
          v-else-if="sectionsError"
          class="rounded-md border border-red-200 bg-red-50 px-2 py-2 text-sm text-red-800"
        >
          {{ sectionsError }}
        </div>

        <div
          v-else-if="!sections.length"
          class="px-2 py-3 text-sm text-slate-600"
        >
          Нет разделов.
        </div>

        <ul v-else class="list-none space-y-0.5">
          <li v-for="(row, index) in sections" :key="sectionKey(row, index)">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-slate-50"
              :class="
                selectedSectionKey === sectionKey(row, index)
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-700'
              "
              @click="selectSection(row, index)"
            >
              <span class="min-w-0 truncate">{{ sectionLabel(row) }}</span>
              <span
                v-if="sectionCount(row) !== ''"
                class="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-xs tabular-nums text-slate-700"
              >
                {{ sectionCount(row) }}
              </span>
            </button>
          </li>
        </ul>
      </div>
    </aside>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <Z8View
        v-if="selectedSectionId"
        ref="z8ViewRef"
        :spec="spec"
        :view-request="viewRequest"
        :view-id="viewId"
        :before-request="listBeforeRequest"
      >
        <template #mainListRow="{ row, selected, formatField }">
          <div
            class="w-full rounded-md border px-3 py-2 text-left"
            :class="
              selected ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'
            "
          >
            <div class="flex items-baseline justify-between gap-2 text-xs">
              <span class="min-w-0 truncate font-semibold text-slate-900">
                {{ formatField('ОВУАвтора') }}
              </span>
              <span class="shrink-0 text-slate-500">{{ formatZ8UnixCellValue(row?.датаМне) }}</span>
            </div>
            <div class="mt-1 truncate text-sm text-slate-800">
              {{ formatField('заголовок') }}
            </div>
            <div class="mt-1 flex items-baseline justify-between gap-2 text-xs text-slate-600">
              <span class="min-w-0 truncate">{{ formatField('регНомер') }}</span>
              <span class="shrink-0">{{ formatField('срочность') }}</span>
            </div>
          </div>
        </template>

        <template #form="{ record }">
          <ManagerFilePreviewForm
            :record="record"
            :client-session="String(client?._http?.session ?? '')"
          />
        </template>
      </Z8View>
      <div
        v-else-if="!sectionsLoading && !sectionsError"
        class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm text-slate-600"
      >
        Выберите раздел.
      </div>
    </div>
  </div>
</template>
