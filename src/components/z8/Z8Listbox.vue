<script setup>
import { computed, ref, watch } from 'vue'

import z8prik from '../../mock/z8prik.json'
import z8srOnline from '../../mock/z8srOnline.json'
import readPrik from '../../mock/readPrik.json'
import readSrOnline from '../../mock/readSrOnline.json'
import { Z8Client } from '../../z8/z8Client.js'

const emit = defineEmits(['select-row', 'refresh'])

const props = defineProps({
  control: { type: Object, required: true },
  record: { type: Object, required: true },
  uiRegistry: { type: Object, default: () => ({}) },
})

const header = computed(() => props.control?.header ?? props.control?.name ?? 'List')
const query = computed(() => props.control?.query ?? null)
const columns = computed(() => Array.isArray(query.value?.columns) ? query.value.columns : [])
const selectable = computed(() => Boolean(props.control?.selectable))
const selectedIndex = computed(() => (Number.isFinite(props.control?.selectedIndex) ? props.control.selectedIndex : -1))
const loading = computed(() => Boolean(props.control?.loading))
const fillHeight = computed(() => Boolean(props.control?.fillHeight))

const internalLoading = ref(false)
const remoteRows = ref(null)
const effectiveLoading = computed(() => loading.value || internalLoading.value)

const isRemote = computed(() => Array.isArray(remoteRows.value))

const dataset = computed(() => {
  if (Array.isArray(props.control?.data)) return props.control.data
  if (Array.isArray(remoteRows.value)) return remoteRows.value
  const name = query.value?.name
  if (name === 'прик') return z8prik?.data ?? []
  if (name === 'srOnline') return z8srOnline?.data ?? []
  return []
})

const linkField = computed(() => query.value?.link?.name ?? (query.value?.name ? `${query.value.name}.readerId` : null))

const filteredRows = computed(() => {
  const rows = Array.isArray(dataset.value) ? dataset.value : []
  const lk = linkField.value
  const recordId = props.record?.recordId

  if (isRemote.value) return rows
  if (!lk || !recordId) return rows
  return rows.filter((r) => r?.[lk] === recordId)
})

function toComparable(v) {
  if (v === null || v === undefined) return { kind: 'empty', value: '' }
  if (typeof v === 'number') return { kind: 'number', value: v }
  if (typeof v === 'boolean') return { kind: 'number', value: v ? 1 : 0 }
  const s = String(v)
  const t = Date.parse(s)
  if (!Number.isNaN(t)) return { kind: 'number', value: t }
  return { kind: 'string', value: s.toLowerCase() }
}

const sortedRows = computed(() => {
  const rows = [...filteredRows.value]
  const sort = Array.isArray(query.value?.sort) ? query.value.sort : []
  if (!sort.length) return rows

  rows.sort((a, b) => {
    for (const s of sort) {
      const prop = s?.property
      if (!prop) continue
      const dir = String(s?.direction ?? 'asc').toLowerCase() === 'desc' ? -1 : 1
      const av = toComparable(a?.[prop])
      const bv = toComparable(b?.[prop])

      if (av.kind === 'empty' && bv.kind !== 'empty') return 1
      if (bv.kind === 'empty' && av.kind !== 'empty') return -1

      if (av.value < bv.value) return -1 * dir
      if (av.value > bv.value) return 1 * dir
    }
    return 0
  })

  return rows
})

const rowKey = computed(() => props.control?.rowKey ?? null)
const selectedKey = computed(() => props.control?.selectedKey ?? null)

function formatCellValue(col, raw) {
  if (raw === null || raw === undefined || raw === '') return '—'
  if (col?.type === 'datetime') {
    const ts = Date.parse(String(raw))
    if (!Number.isNaN(ts)) return new Date(ts).toLocaleString()
  }
  if (typeof raw === 'boolean') return raw ? 'true' : 'false'
  return String(raw)
}

function onRowClick(row, index) {
  if (!selectable.value) return
  const rk = rowKey.value
  const key = rk ? row?.[rk] : undefined
  emit('select-row', { row, index, key })
}

function onRefreshClick() {
  emit('refresh')
}

const client = new Z8Client()

const isSubQueryList = computed(() => {
  const name = query.value?.name
  return name === 'прик' || name === 'srOnline'
})

async function refreshFromApi() {
  if (!isSubQueryList.value) return
  if (internalLoading.value) return

  const request = query.value?.request
  const queryName = query.value?.name
  const recordId = props.record?.recordId

  if (!request || !queryName || !recordId) return

  internalLoading.value = true
  try {
    const link = query.value?.link?.name
    const filter = link ? [{ property: link, value: recordId }] : []

    const fields = Array.isArray(query.value?.fields)
      ? query.value.fields.map((f) => f?.name).filter(Boolean)
      : []

    const sort = Array.isArray(query.value?.sort) ? query.value.sort : []
    const values = { recordId }

    const res = await client.readQuery({
      request,
      query: queryName,
      fields,
      filter,
      sort,
      values,
      start: 0,
      limit: 200,
    })

    remoteRows.value = Array.isArray(res?.data) ? res.data : []
  } catch {
    const fallback = query.value?.name === 'прик' ? (readPrik?.data ?? []) : (readSrOnline?.data ?? [])
    remoteRows.value = Array.isArray(fallback) ? fallback : []
  } finally {
    internalLoading.value = false
  }
}

watch(
  () => props.record?.recordId,
  () => {
    remoteRows.value = null
    refreshFromApi()
  },
  { immediate: true }
)
</script>

<template>
  <section
    class="rounded-lg border border-slate-200 bg-slate-50 p-3"
    :class="fillHeight ? 'flex h-full min-h-0 flex-col' : 'space-y-2'"
  >
    <div :class="fillHeight ? 'flex shrink-0 items-start justify-between gap-3' : 'flex items-start justify-between gap-3'">
      <div class="min-w-0">
        <div class="truncate text-sm font-semibold text-slate-800">{{ header }}</div>
        <div class="truncate text-xs text-slate-500">
          {{ query?.text ?? query?.name ?? '—' }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="effectiveLoading"
          @click="isSubQueryList ? refreshFromApi() : onRefreshClick()"
        >
          {{ effectiveLoading ? '...' : 'Обновить' }}
        </button>
        <div class="shrink-0 rounded bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700">
          {{ sortedRows.length }}
        </div>
      </div>
    </div>

    <div v-if="!columns.length" class="shrink-0 text-xs text-slate-600">
      Нет описания колонок в `query.columns`.
    </div>

    <div v-else-if="!sortedRows.length" class="shrink-0 text-xs text-slate-600">
      Нет данных для текущей записи.
    </div>

    <div
      v-else
      :class="fillHeight ? 'min-h-0 flex-1 overflow-auto' : 'max-h-80 overflow-auto'"
    >
      <table class="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th
              v-for="(c, idx) in columns"
              :key="c?.name ?? idx"
              class="sticky top-0 border-b border-slate-200 bg-slate-50 px-2 py-1 text-left text-xs font-semibold text-slate-700"
            >
              {{ c?.header ?? c?.name ?? '—' }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, ridx) in sortedRows"
            :key="row?.recordId ?? row?.[`${query?.name}.recordId`] ?? ridx"
            class="odd:bg-white/60"
            :class="selectable && ((selectedKey != null && rowKey && row?.[rowKey] === selectedKey) || (selectedKey == null && ridx === selectedIndex)) ? 'bg-slate-200/60' : ''"
            @click="onRowClick(row, ridx)"
          >
            <td
              v-for="(c, cidx) in columns"
              :key="c?.name ?? cidx"
              class="border-b border-slate-200 px-2 py-1 text-xs text-slate-800"
              :class="selectable ? 'cursor-pointer' : ''"
            >
              <span class="whitespace-nowrap">{{ formatCellValue(c, row?.[c?.name]) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

