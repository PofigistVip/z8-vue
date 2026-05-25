<script setup>
import { computed, inject, ref, watch } from 'vue'

import { Z8Client } from '../../z8/z8Client.js'
import { formatZ8DisplayValue, serializeZ8ValueForApi } from '../../z8/z8Format.js'

const props = defineProps({
  control: { type: Object, required: true },
  record: { type: Object, required: true },
})

const formRequest = inject('z8FormRequest', computed(() => ''))
const injectedClient = inject('z8Client', null)
const client = injectedClient instanceof Z8Client ? injectedClient : new Z8Client()

const label = computed(() => props.control?.header ?? props.control?.name ?? '')
const name = computed(() => props.control?.name ?? '')
const required = computed(() => Boolean(props.control?.required))
const readOnly = computed(() => Boolean(props.control?.readOnly))

const editable = computed(
  () => !readOnly.value && !props.control?.isAction && !props.control?.isListbox
)

const rawValue = computed(() => (name.value ? props.record?.[name.value] : undefined))

const fieldKind = computed(() => {
  if (props.control?.type === 'boolean') return 'boolean'
  if (props.control?.type === 'date') return 'date'
  if (props.control?.type === 'datetime') return 'datetime'
  return 'text'
})

const displayValue = computed(() =>
  formatZ8DisplayValue(rawValue.value, props.control?.type)
)

const saving = ref(false)
const hasError = ref(false)
const localText = ref('')
const localBool = ref(false)
const focusSnapshot = ref(undefined)

function requestValue() {
  const r = formRequest
  return typeof r === 'object' && r !== null && 'value' in r ? r.value : r
}

function toDatetimeLocal(raw) {
  if (raw === null || raw === undefined || raw === '') return ''
  const ts = Date.parse(String(raw))
  if (Number.isNaN(ts)) return String(raw)
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toDateInput(raw) {
  if (raw === null || raw === undefined || raw === '') return ''
  const ts = Date.parse(String(raw))
  if (Number.isNaN(ts)) return String(raw)
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function syncFromRecord() {
  const v = rawValue.value
  if (fieldKind.value === 'boolean') {
    localBool.value = Boolean(v)
  } else if (fieldKind.value === 'datetime') {
    localText.value = toDatetimeLocal(v)
  } else if (fieldKind.value === 'date') {
    localText.value = toDateInput(v)
  } else {
    localText.value = displayValue.value
  }
}

watch(
  () => [name.value, props.record?.recordId, rawValue.value],
  () => {
    if (!saving.value) syncFromRecord()
  },
  { immediate: true }
)

function valuesEqual(a, b) {
  if (a === b) return true
  if (a === null || a === undefined) return b === null || b === undefined || b === ''
  if (b === null || b === undefined) return a === ''
  return String(a) === String(b)
}

function parseValueForSubmit() {
  if (fieldKind.value === 'boolean') return localBool.value
  if (fieldKind.value === 'date' || fieldKind.value === 'datetime') {
    return serializeZ8ValueForApi(localText.value, props.control?.type)
  }
  return localText.value
}

function onFocus() {
  focusSnapshot.value =
    fieldKind.value === 'boolean' ? localBool.value : parseValueForSubmit()
  hasError.value = false
}

async function onBlur() {
  if (!editable.value || saving.value) return
  const rid = props.record?.recordId
  const fieldName = name.value
  if (!rid || !fieldName) return

  const newVal = parseValueForSubmit()
  if (valuesEqual(newVal, focusSnapshot.value)) return

  const request = requestValue()
  if (!request) return

  const payload = { recordId: rid, [fieldName]: newVal }
  saving.value = true
  hasError.value = false
  try {
    const res = await client.update({ request, data: [payload] })
    const updated = res?.data?.[0]
    if (updated && typeof updated === 'object') {
      Object.assign(props.record, updated)
      syncFromRecord()
    } else {
      props.record[fieldName] = newVal
    }
    focusSnapshot.value = newVal
  } catch {
    hasError.value = true
    syncFromRecord()
  } finally {
    saving.value = false
  }
}

function onBooleanChange(e) {
  localBool.value = e.target.checked
}

const inputClass = computed(() => [
  'w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2',
  hasError.value
    ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
    : 'border-slate-300 focus:border-slate-400 focus:ring-slate-200',
  saving.value ? 'opacity-60' : '',
])
</script>

<template>
  <div class="space-y-1">
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

    <label
      v-else-if="fieldKind === 'boolean'"
      class="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
      :class="{ 'opacity-60': saving, 'border-red-400': hasError }"
    >
      <input
        type="checkbox"
        :checked="localBool"
        :disabled="saving"
        @focus="onFocus"
        @blur="onBlur"
        @change="onBooleanChange"
      />
      <span class="text-slate-700">{{ localBool ? 'да' : 'нет' }}</span>
    </label>

    <input
      v-else
      :type="fieldKind === 'datetime' ? 'datetime-local' : fieldKind === 'date' ? 'date' : 'text'"
      :class="inputClass"
      v-model="localText"
      :placeholder="control?.format || ''"
      :required="required"
      :disabled="saving"
      @focus="onFocus"
      @blur="onBlur"
    />
  </div>
</template>
