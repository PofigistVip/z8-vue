<script setup>
import { computed, inject, ref, watch } from 'vue'

import { Z8Client } from '../../z8/z8Client.js'
import { formatZ8CellValue } from '../../z8/z8Format.js'

import Z8ListItem from './Z8ListItem.vue'
import {
  buildReadQueryPaging,
  getClientLinkField,
  normalizeListColumns,
} from '../../z8/z8ListPaging.js'

const emit = defineEmits(['select-row', 'server-response'])

const props = defineProps({
  control: { type: Object, required: true },
  record: { type: Object, required: true },
  variant: { type: String, default: 'default' },
})

const injectedClient = inject('z8Client', null)
const client = injectedClient instanceof Z8Client ? injectedClient : new Z8Client()

const query = computed(() => props.control?.query ?? null)
const listMode = computed(() => props.control?.listMode ?? 'listbox')

const columns = computed(() => normalizeListColumns(query.value))
const selectable = computed(() => Boolean(props.control?.selectable))
const selectedIndex = computed(() =>
  Number.isFinite(props.control?.selectedIndex) ? props.control.selectedIndex : -1
)
const loading = computed(() => Boolean(props.control?.loading))
const fillHeight = computed(() => Boolean(props.control?.fillHeight))
const isCompact = computed(() => props.variant === 'compact')

const internalLoading = ref(false)
const effectiveLoading = computed(() => loading.value || internalLoading.value)

const serverPageRows = ref([])
const pageStart = ref(0)
const pageTotal = ref(null)
const pageLimit = ref(200)

const builtReadQueryPaging = computed(() =>
  buildReadQueryPaging({
    query: query.value,
    link: props.control?.link,
    record: props.record,
    mode: listMode.value,
    displayFieldName: props.control?.displayFieldName ?? props.control?.name,
    sourceRequest: props.control?.source?.request,
  })
)

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
  return []
})

const linkField = computed(() => getClientLinkField(query.value, listMode.value))

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

const rowCount = computed(() => sortedRows.value.length)

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
  return formatZ8CellValue(raw, col?.type)
}

function formatField(row, name) {
  const col = columns.value.find((c) => c?.name === name)
  return formatCellValue(col, row?.[name])
}

function rowWrapperClass(row, ridx) {
  const selected = isRowSelected(row, ridx)
  return [
    selected ? 'bg-sky-100 ring-1 ring-inset ring-sky-300' : ridx % 2 === 1 ? 'bg-white' : '',
    selectable.value
      ? ['cursor-pointer', !selected ? 'hover:bg-slate-100' : '']
      : '',
  ]
}

function onRowClick(row, index) {
  if (!selectable.value) return
  const rk = rowKey.value
  const key = rk ? row?.[rk] : undefined
  emit('select-row', { row, index, key })
}

function isRowSelected(row, ridx) {
  if (!selectable.value) return false
  if (selectedKey.value != null && rowKey.value) {
    return row?.[rowKey.value] === selectedKey.value
  }
  return ridx === selectedIndex.value
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
  if (listMode.value === 'combobox') return
  if (!selectable.value) return
  if (!rows.length) {
    emit('select-row', { row: undefined, index: -1, key: undefined })
    return
  }
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
        beforeRequest: sp.beforeRequest,
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

    const rows = Array.isArray(res?.data) ? res.data : []

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
            beforeRequest: sp.beforeRequest,
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

defineExpose({
  reload,
  prependRow,
  removeRow,
  rangeLabel,
  rowCount,
  useServerPaging,
  effectiveLoading,
})

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
  <div
    class="flex min-h-0 flex-col"
    :class="
      isCompact
        ? 'max-h-48 overflow-hidden'
        : fillHeight
          ? 'h-full flex-1'
          : 'max-h-80 overflow-hidden'
    "
  >
    <div v-if="!columns.length" class="shrink-0 text-xs text-slate-600">
      Нет описания колонок в `query.columns`.
    </div>

    <template v-else>
      <div v-if="!sortedRows.length && !effectiveLoading" class="shrink-0 text-xs text-slate-600">
        Нет данных для текущей записи.
      </div>

      <div
        v-else
        class="min-h-0 flex-1 overflow-auto"
      >
        <div
          v-if="$slots.row"
          class="flex flex-col gap-1 p-1"
        >
          <div
            v-for="(row, ridx) in sortedRows"
            :key="row?.recordId ?? row?.[`${query?.name}.recordId`] ?? ridx"
            :class="rowWrapperClass(row, ridx)"
            @click="onRowClick(row, ridx)"
          >
            <slot
              name="row"
              :row="row"
              :row-index="ridx"
              :selected="isRowSelected(row, ridx)"
              :selectable="selectable"
              :format-field="(name) => formatField(row, name)"
            />
          </div>
        </div>

        <table
          v-else
          class="min-w-full border-separate border-spacing-0"
        >
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
            <Z8ListItem
              v-for="(row, ridx) in sortedRows"
              :key="row?.recordId ?? row?.[`${query?.name}.recordId`] ?? ridx"
              :row="row"
              :row-index="ridx"
              :columns="columns"
              :selectable="selectable"
              :selected="isRowSelected(row, ridx)"
              @click="onRowClick"
            />
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
  </div>
</template>
