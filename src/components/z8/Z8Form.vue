<script setup>
import { computed } from 'vue'

import Z8ControlRenderer from './Z8ControlRenderer.vue'
import { uiRegistry } from '../../z8/uiRegistry'

const props = defineProps({
  spec: { type: Object, required: true },
  record: { type: Object, required: true },
})
const controls = computed(() => Array.isArray(props.spec?.controls) ? props.spec.controls : [])
const colCount = computed(() => {
  const v = Number.parseInt(String(props.spec?.colCount ?? ''), 10)
  return Number.isFinite(v) && v > 0 ? v : 1
})

function cellStyle(child) {
  const span = Number.parseInt(String(child?.colSpan ?? ''), 10)
  if (!Number.isFinite(span) || span <= 1) return undefined
  return { gridColumn: `span ${span} / span ${span}` }
}
</script>

<template>
  <section class="flex h-full min-h-0 flex-col">
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-white">
      <div class="shrink-0 border-b px-4 py-3">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="truncate text-base font-semibold">
              {{ spec?.text ?? spec?.ui ?? 'Form' }}
            </div>
            <div class="truncate text-sm text-slate-500">
              {{ record?.recordId ?? record?.id ?? '—' }}
            </div>
          </div>
          <div class="text-right text-xs text-slate-500">
            {{ spec?.request ?? spec?.sourceCode ?? '—' }}
          </div>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-hidden p-4">
        <div class="grid h-full min-h-0 gap-4" :style="{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }">
          <div v-for="(c, idx) in controls" :key="c?.name ?? idx" class="min-h-0" :style="cellStyle(c)">
            <Z8ControlRenderer
              :control="c"
              :record="record"
              :ui-registry="uiRegistry"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

