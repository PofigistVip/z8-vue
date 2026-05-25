<script setup>
import { computed, inject, onMounted, onUnmounted, ref } from 'vue'

import { Z8Client } from '../../z8/z8Client.js'
import { formatZ8DisplayValue } from '../../z8/z8Format.js'
import { normalizeListColumn } from '../../z8/z8ListPaging.js'
import Z8List from './Z8List.vue'

const props = defineProps({
  control: { type: Object, required: true },
  record: { type: Object, required: true },
})

const formRequest = inject('z8FormRequest', computed(() => ''))
const injectedClient = inject('z8Client', null)
const client = injectedClient instanceof Z8Client ? injectedClient : new Z8Client()

const label = computed(() => props.control?.header ?? props.control?.name ?? '')
const fieldName = computed(() => props.control?.name ?? '')
const required = computed(() => Boolean(props.control?.required))
const readOnly = computed(() => Boolean(props.control?.readOnly))
const editable = computed(() => !readOnly.value)

const rawValue = computed(() =>
  fieldName.value ? props.record?.[fieldName.value] : undefined
)

const displayValue = computed(() =>
  formatZ8DisplayValue(rawValue.value, props.control?.type)
)

const open = ref(false)
const saving = ref(false)
const hasError = ref(false)
const rootRef = ref(null)

const linkFk = computed(() => props.control?.link?.name ?? null)
const rowKeyField = computed(
  () => props.control?.link?.primaryKey ?? props.control?.query?.primaryKey ?? null
)

const selectedKey = computed(() => {
  const fk = linkFk.value
  return fk ? props.record?.[fk] : undefined
})

const listControl = computed(() => {
  const q = props.control?.query
  const displayCol = normalizeListColumn({
    name: fieldName.value,
    header: props.control?.header ?? fieldName.value,
    type: props.control?.type ?? 'string',
  })
  const query = q
    ? {
        ...q,
        columns: displayCol ? [displayCol] : [],
      }
    : null

  return {
    query,
    link: props.control?.link,
    source: props.control?.source,
    listMode: 'combobox',
    displayFieldName: fieldName.value,
    selectable: true,
    rowKey: rowKeyField.value,
    selectedKey: selectedKey.value,
  }
})

function requestValue() {
  const r = formRequest
  return typeof r === 'object' && r !== null && 'value' in r ? r.value : r
}

function onToggleOpen() {
  if (!editable.value || saving.value) return
  open.value = !open.value
}

function onDocumentClick(e) {
  if (!open.value || !rootRef.value) return
  if (!rootRef.value.contains(e.target)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

async function onSelectRow({ row, key }) {
  if (!editable.value || saving.value) return
  const fk = linkFk.value
  const pk = rowKeyField.value
  const rid = props.record?.recordId
  if (!fk || !rid) return

  const newId = pk && row ? row[pk] : key
  if (newId === undefined) return
  if (newId === selectedKey.value) {
    open.value = false
    return
  }

  const request = requestValue()
  if (!request) return

  saving.value = true
  hasError.value = false
  try {
    const res = await client.update({
      request,
      data: [{ recordId: rid, [fk]: newId }],
    })
    const updated = res?.data?.[0]
    if (updated && typeof updated === 'object') {
      Object.assign(props.record, updated)
    } else {
      props.record[fk] = newId
    }
    open.value = false
  } catch {
    hasError.value = true
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div ref="rootRef" class="relative space-y-1">
    <div class="flex items-center gap-2 text-xs text-slate-600">
      <span class="truncate font-medium">{{ label }}</span>
      <span v-if="required" class="text-red-600">*</span>
      <span v-if="readOnly" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">RO</span>
      <span v-if="saving" class="text-[10px] text-slate-500">сохранение…</span>
    </div>

    <div
      v-if="!editable"
      class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
    >
      <span class="break-words">{{ displayValue || '—' }}</span>
    </div>

    <template v-else>
      <button
        type="button"
        class="flex w-full items-center justify-between gap-2 rounded-md border bg-white px-3 py-2 text-left text-sm text-slate-900 outline-none focus:ring-2"
        :class="[
          hasError
            ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-300 focus:border-slate-400 focus:ring-slate-200',
          saving ? 'opacity-60' : '',
        ]"
        :disabled="saving"
        @click.stop="onToggleOpen"
      >
        <span class="truncate">{{ displayValue || '—' }}</span>
        <span class="shrink-0 text-slate-400" aria-hidden="true">▾</span>
      </button>

      <div
        v-if="open"
        class="absolute z-20 mt-1 w-full min-w-[16rem] rounded-md border border-slate-200 bg-white p-2 shadow-lg"
        @click.stop
      >
        <Z8List
          variant="compact"
          :control="listControl"
          :record="record"
          @select-row="onSelectRow"
        />
      </div>
    </template>
  </div>
</template>
