<script setup>
import { computed, ref } from 'vue'

import Z8List from './Z8List.vue'

const emit = defineEmits(['select-row', 'refresh', 'server-response'])

const props = defineProps({
  control: { type: Object, required: true },
  record: { type: Object, required: true },
  uiRegistry: { type: Object, default: () => ({}) },
})

const listRef = ref(null)

const header = computed(() => props.control?.header ?? props.control?.name ?? 'List')
const query = computed(() => props.control?.query ?? null)

const listControl = computed(() => ({
  ...props.control,
  listMode: props.control?.listMode ?? 'listbox',
}))

const effectiveLoading = computed(() => Boolean(listRef.value?.effectiveLoading))
const useServerPaging = computed(() => Boolean(listRef.value?.useServerPaging))

function onRefreshClick() {
  if (useServerPaging.value) {
    listRef.value?.reload?.()
    return
  }
  emit('refresh')
}

function onSelectRow(payload) {
  emit('select-row', payload)
}

function onServerResponse(res) {
  emit('server-response', res)
}

defineExpose({
  reload: () => listRef.value?.reload?.(),
  prependRow: (row) => listRef.value?.prependRow?.(row),
  removeRow: (key) => listRef.value?.removeRow?.(key),
})
</script>

<template>
  <section
    class="rounded-lg border border-slate-200 bg-slate-50 p-3"
    :class="
      control?.fillHeight
        ? 'flex h-full min-h-0 flex-col'
        : 'flex max-h-80 flex-col overflow-hidden'
    "
  >
    <div class="flex shrink-0 items-start justify-between gap-3">
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
          <template v-if="listRef">
            {{ listRef.useServerPaging ? listRef.rangeLabel : listRef.rowCount }}
          </template>
          <template v-else>0</template>
        </div>
      </div>
    </div>

    <slot
      name="list"
      :control="listControl"
      :record="record"
      :on-select-row="onSelectRow"
      :on-server-response="onServerResponse"
    >
      <Z8List
        ref="listRef"
        class="min-h-0 flex-1"
        :control="listControl"
        :record="record"
        @select-row="onSelectRow"
        @server-response="onServerResponse"
      />
    </slot>
  </section>
</template>
