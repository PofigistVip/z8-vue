<script setup>
import { computed, inject, ref, watch } from 'vue'

import z8prik from '../../mock/z8prik.json'
import z8srOnline from '../../mock/z8srOnline.json'
import readPrik from '../../mock/readPrik.json'
import readSrOnline from '../../mock/readSrOnline.json'
import { Z8Client } from '../../z8/z8Client.js'

const emit = defineEmits(['select-row', 'refresh', 'server-response'])

const props = defineProps({
  control: { type: Object, required: true },
  record: { type: Object, required: true },
  uiRegistry: { type: Object, default: () => ({}) },
})

const injectedClient = inject('z8Client', null)
const client = injectedClient instanceof Z8Client ? injectedClient : new Z8Client()

const header = computed(() => props.control?.header ?? props.control?.name ?? 'List')
const query = computed(() => props.control?.query ?? null)
const columns = computed(() => (Array.isArray(query.value?.columns) ? query.value.columns : []))
const selectable = computed(() => Boolean(props.control?.selectable))
const selectedIndex = computed(() =>
  Number.isFinite(props.control?.selectedIndex) ? props.control.selectedIndex : -1
)
const loading = computed(() => Boolean(props.control?.loading))
const fillHeight = computed(() => Boolean(props.control?.fillHeight))

const internalLoading = ref(false)
const effectiveLoading = computed(() => loading.value || internalLoading.value)

const serverPageRows = ref([])
const pageStart = ref(0)
const pageTotal = ref(null)
const pageLimit = ref(200)

const isMockQueryName = computed(() => {
  const name = query.value?.name
  return name === 'прик' || name === 'srOnline'
})

const builtReadQueryPaging = computed(() => {
  const q = query.value
  if (!q) return null
  const request = q.request
  const queryName = q.name
  const recordId = props.record?.recordId
  if (!request || !queryName || !recordId) return null

  const link = q.link?.name
  const filter = link ? [{ property: link, value: recordId }] : []
  let fields = Array.isArray(q.fields) ? q.fields.map((f) => f?.name).filter(Boolean) : []
  if (!fields.length && Array.isArray(q.columns)) {
    fields = q.columns.map((c) => c?.name).filter(Boolean)
  }
  const sort = Array.isArray(q.sort) ? q.sort : []
  const values = { recordId }

  return {
    kind: 'readQuery',
    request,
    query: queryName,
    fields,
    filter,
    sort,
    values,
    limit: 200,
  }
})

const effectiveServerPaging = computed(() => props.control?.serverPaging ?? builtReadQueryPaging.value)

const userSort = ref(null)

const requestSort = computed(() => {
  if (userSort.value) {
    return [{ property: userSort.value.property, direction: userSort.value.direction }]
  }
  const sp = effectiveServerPaging.value
  if (sp?.kind === 'readQuery' && Array.isArray(sp.sort) && sp.sort.length) {
    return sp.sort
  }
  return []
})

const pagingWithSort = computed(() => {
  const sp = effectiveServerPaging.value
  if (!sp) return null
  return { ...sp, sort: requestSort.value }
})

const serverPagingBaseKey = computed(() => {
  const sp = effectiveServerPaging.value
  if (!sp) return ''
  if (sp.kind === 'read') {
    return `read|${sp.request}|${JSON.stringify(sp.period ?? null)}|${Number(sp.limit) || 200}`
  }
  if (sp.kind === 'readQuery') {
    return `rq|${sp.request}|${sp.query}|${Number(sp.limit) || 200}|${JSON.stringify(sp.filter ?? null)}|${JSON.stringify(sp.values ?? null)}`
  }
  return ''
})

const useServerPaging = computed(() => Boolean(effectiveServerPaging.value))

const pagingBaseFingerprint = computed(() => serverPagingBaseKey.value)

const dataset = computed(() => {
  if (useServerPaging.value) return Array.isArray(serverPageRows.value) ? serverPageRows.value : []
  if (Array.isArray(props.control?.data)) return props.control.data
  if (isMockQueryName.value) {
    const name = query.value?.name
    if (name === 'прик') return z8prik?.data ?? []
    if (name === 'srOnline') return z8srOnline?.data ?? []
  }
  return []
})

const linkField = computed(
  () => query.value?.link?.name ?? (query.value?.name ? `${query.value.name}.readerId` : null)
)

const filteredRows = computed(() => {
  const rows = Array.isArray(dataset.value) ? dataset.value : []
  if (useServerPaging.value) return rows
  const lk = linkField.value
  const recordId = props.record?.recordId
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
  if (useServerPaging.value) return rows
  const sort = requestSort.value
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

const rangeLabel = computed(() => {
  const n = sortedRows.value.length
  if (!n) {
    const t = pageTotal.value
    return t != null && Number.isFinite(t) ? `0 из ${t}` : '0'
  }
  const from = pageStart.value + 1
  const to = pageStart.value + n
  const t = pageTotal.value
  if (t != null && Number.isFinite(t)) return `${from}–${to} из ${t}`
  return `${from}–${to}`
})

const canPrevPage = computed(() => useServerPaging.value && pageStart.value > 0)

const canNextPage = computed(() => {
  if (!useServerPaging.value) return false
  const lim = pageLimit.value
  const n = sortedRows.value.length
  if (n < lim) return false
  const t = pageTotal.value
  if (t != null && Number.isFinite(t)) return pageStart.value + lim < t
  return true
})

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
  if (useServerPaging.value) {
    loadPage(0)
    return
  }
  emit('refresh')
}

function onSortHeader(col) {
  const prop = col?.name
  if (!prop) return
  if (userSort.value?.property === prop) {
    userSort.value = {
      property: prop,
      direction: userSort.value.direction === 'asc' ? 'desc' : 'asc',
    }
  } else {
    userSort.value = { property: prop, direction: 'asc' }
  }
  if (useServerPaging.value) loadPage(0)
}

function syncSelectionAfterLoad(rows) {
  if (!selectable.value || !rows.length) return
  const rk = rowKey.value
  const sk = selectedKey.value
  if (rk && sk && rows.some((r) => r?.[rk] === sk)) return
  if (rk) {
    const key = rows[0]?.[rk]
    emit('select-row', { row: rows[0], index: 0, key })
  }
}

async function loadPage(start) {
  const sp = pagingWithSort.value
  if (!sp) return

  const limit = Number(sp.limit) > 0 ? Number(sp.limit) : 200
  const sort = Array.isArray(sp.sort) && sp.sort.length ? sp.sort : undefined
  internalLoading.value = true
  try {
    let res
    if (sp.kind === 'read') {
      res = await client.read({
        request: sp.request,
        period: sp.period ?? { start: null, finish: null },
        start,
        limit,
        sort,
      })
    } else if (sp.kind === 'readQuery') {
      res = await client.readQuery({
        request: sp.request,
        query: sp.query,
        fields: sp.fields,
        filter: sp.filter,
        sort: sp.sort ?? [],
        values: sp.values,
        start,
        limit,
      })
    } else {
      return
    }

    let rows = Array.isArray(res?.data) ? res.data : []
    if (!rows.length && sp.kind === 'readQuery' && isMockQueryName.value) {
      const fallback =
        query.value?.name === 'прик' ? (readPrik?.data ?? []) : (readSrOnline?.data ?? [])
      rows = Array.isArray(fallback) ? fallback : []
    }

    serverPageRows.value = rows
    pageStart.value = start
    pageLimit.value = limit

    let total
    if (rows.length < limit) {
      total = start + rows.length
    } else {
      try {
        let countRes
        if (sp.kind === 'read') {
          countRes = await client.read({
            request: sp.request,
            period: sp.period ?? { start: null, finish: null },
            start,
            limit,
            count: true,
          })
        } else {
          countRes = await client.readQuery({
            request: sp.request,
            query: sp.query,
            fields: sp.fields,
            filter: sp.filter,
            sort: sp.sort,
            values: sp.values,
            start,
            limit,
            count: true,
          })
        }
        const raw = countRes?.total
        total = typeof raw === 'number' ? raw : Number(raw)
        if (!Number.isFinite(total)) total = null
      } catch {
        total = null
      }
    }
    pageTotal.value = total

    emit('server-response', res)
    syncSelectionAfterLoad(rows)
  } finally {
    internalLoading.value = false
  }
}

function goPrevPage() {
  if (!canPrevPage.value) return
  loadPage(Math.max(0, pageStart.value - pageLimit.value))
}

function goNextPage() {
  if (!canNextPage.value) return
  loadPage(pageStart.value + pageLimit.value)
}

async function reload() {
  await loadPage(0)
}

function prependRow(row) {
  if (!row || !useServerPaging.value) return
  const rk = rowKey.value ?? 'recordId'
  const key = row[rk]
  serverPageRows.value = [
    row,
    ...serverPageRows.value.filter((r) => r?.[rk] !== key),
  ]
  pageStart.value = 0
  if (pageTotal.value != null && Number.isFinite(pageTotal.value)) {
    pageTotal.value += 1
  }
  emit('select-row', { row, index: 0, key })
}

function removeRow(key) {
  if (!key || !useServerPaging.value) return
  const rk = rowKey.value ?? 'recordId'
  const rows = serverPageRows.value.filter((r) => r?.[rk] !== key)
  serverPageRows.value = rows
  if (pageTotal.value != null && Number.isFinite(pageTotal.value) && pageTotal.value > 0) {
    pageTotal.value -= 1
  }
  if (rows.length) {
    emit('select-row', { row: rows[0], index: 0, key: rows[0]?.[rk] })
  } else {
    emit('select-row', { row: undefined, index: -1, key: undefined })
  }
}

defineExpose({ reload, prependRow, removeRow })

watch(serverPagingBaseKey, (newKey, oldKey) => {
  if (newKey !== oldKey) userSort.value = null
})

watch(
  pagingBaseFingerprint,
  () => {
    const sp = pagingWithSort.value
    if (!sp) {
      serverPageRows.value = []
      pageStart.value = 0
      pageTotal.value = null
      return
    }
    loadPage(0)
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
          @click="onRefreshClick"
        >
          {{ effectiveLoading ? '...' : 'Обновить' }}
        </button>
        <div class="shrink-0 rounded bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700">
          {{ useServerPaging ? rangeLabel : sortedRows.length }}
        </div>
      </div>
    </div>

    <div v-if="!columns.length" class="shrink-0 text-xs text-slate-600">
      Нет описания колонок в `query.columns`.
    </div>

    <template v-else>
      <div v-if="!sortedRows.length" class="shrink-0 text-xs text-slate-600">
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
                class="sticky top-0 cursor-pointer select-none border-b border-slate-200 bg-slate-50 px-2 py-1 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                @click="onSortHeader(c)"
              >
                <span class="inline-flex items-center gap-1">
                  {{ c?.header ?? c?.name ?? '—' }}
                  <span
                    v-if="userSort?.property === c?.name"
                    class="text-slate-500"
                    aria-hidden="true"
                  >
                    {{ userSort.direction === 'asc' ? '↑' : '↓' }}
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, ridx) in sortedRows"
              :key="row?.recordId ?? row?.[`${query?.name}.recordId`] ?? ridx"
              class="odd:bg-white/60"
              :class="
                selectable &&
                ((selectedKey != null && rowKey && row?.[rowKey] === selectedKey) ||
                  (selectedKey == null && ridx === selectedIndex))
                  ? 'bg-slate-200/60'
                  : ''
              "
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

      <div
        v-if="useServerPaging"
        class="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2"
      >
        <span class="text-[11px] text-slate-600">{{ rangeLabel }}</span>
        <div class="flex gap-1">
          <button
            type="button"
            class="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canPrevPage || effectiveLoading"
            @click="goPrevPage"
          >
            Назад
          </button>
          <button
            type="button"
            class="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canNextPage || effectiveLoading"
            @click="goNextPage"
          >
            Вперёд
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
