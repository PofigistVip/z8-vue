<script setup>
import { computed } from 'vue'

const props = defineProps({
  control: { type: Object, required: true },
  record: { type: Object, required: true },
})

const label = computed(() => props.control?.header ?? props.control?.name ?? '')
const name = computed(() => props.control?.name ?? '')
const required = computed(() => Boolean(props.control?.required))
const readOnly = computed(() => Boolean(props.control?.readOnly))

const rawValue = computed(() => (name.value ? (props.record?.[name.value] ?? '') : ''))

const fieldKind = computed(() => {
  if (props.control?.type === 'boolean') return 'boolean'
  if (props.control?.type === 'datetime') return 'datetime'
  return 'text'
})

const displayValue = computed(() => {
  const v = rawValue.value
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
})
</script>

<template>
  <div class="space-y-1">
    <div class="flex items-center gap-2 text-xs text-slate-600">
      <span class="truncate font-medium">{{ label }}</span>
      <span v-if="required" class="text-red-600">*</span>
      <span v-if="readOnly" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">RO</span>
    </div>

    <div v-if="control?.isText || readOnly" class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
      <span class="break-words">{{ displayValue || '—' }}</span>
    </div>

    <input
      v-else-if="fieldKind !== 'boolean'"
      class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      :value="displayValue"
      :placeholder="control?.format || ''"
      :required="required"
      disabled
    />

    <label v-else class="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
      <input type="checkbox" :checked="Boolean(rawValue)" disabled />
      <span class="text-slate-700">значение</span>
    </label>
  </div>
</template>

