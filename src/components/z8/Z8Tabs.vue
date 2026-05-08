<script setup>
import { computed, ref } from 'vue'

import Z8Section from './Z8Section.vue'

const props = defineProps({
  control: { type: Object, required: true },
  record: { type: Object, required: true },
  uiRegistry: { type: Object, default: () => ({}) },
})

const tabs = computed(() => Array.isArray(props.control?.tabs) ? props.control.tabs : [])
const active = ref(0)

const activeTab = computed(() => tabs.value[active.value] ?? null)
</script>

<template>
  <section class="flex h-full min-h-0 flex-col">
    <div class="flex shrink-0 flex-wrap gap-2 border-b border-slate-200">
      <button
        v-for="(t, idx) in tabs"
        :key="t?.name ?? idx"
        type="button"
        class="rounded-t-md px-3 py-2 text-sm font-medium"
        :class="idx === active ? 'border border-b-0 border-slate-200 bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'"
        @click="active = idx"
      >
        {{ t?.header ?? t?.name ?? `Tab ${idx + 1}` }}
      </button>
    </div>

    <div v-if="activeTab" class="min-h-0 flex-1 overflow-hidden rounded-b-md border border-slate-200 bg-white p-4">
      <Z8Section :control="activeTab" :record="record" :ui-registry="uiRegistry" />
    </div>
  </section>
</template>

