<script setup>
import { computed } from 'vue'

import Z8ControlRenderer from './Z8ControlRenderer.vue'

const props = defineProps({
  control: { type: Object, required: true },
  record: { type: Object, required: true },
  uiRegistry: { type: Object, default: () => ({}) },
})

const header = computed(() => props.control?.header ?? '')
const colCount = computed(() => {
  const v = Number.parseInt(String(props.control?.colCount ?? ''), 10)
  return Number.isFinite(v) && v > 0 ? v : 1
})

const children = computed(() => Array.isArray(props.control?.controls) ? props.control.controls : [])

function cellStyle(child) {
  const span = Number.parseInt(String(child?.colSpan ?? ''), 10)
  if (!Number.isFinite(span) || span <= 1) return undefined
  return { gridColumn: `span ${span} / span ${span}` }
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <div v-if="header" class="shrink-0 text-sm font-semibold text-slate-800">
      {{ header }}
    </div>

    <div
      class="grid gap-4"
      :style="{
        gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
        gridAutoRows: 'auto',
      }"
    >
      <div v-for="(c, idx) in children" :key="c?.name ?? idx" class="min-w-0" :style="cellStyle(c)">
        <Z8ControlRenderer :control="c" :record="record" :ui-registry="uiRegistry" />
      </div>
    </div>
  </section>
</template>

