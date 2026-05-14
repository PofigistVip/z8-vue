<script setup>
import { computed, ref, shallowRef, watch } from 'vue'

import Z8Form from './Z8Form.vue'
import Z8Listbox from './Z8Listbox.vue'

const props = defineProps({
  spec: { type: Object, required: true },
  viewRequest: {
    type: String,
    default: 'ru.moscollector.control.module.cards.view.СчитывателиView',
  },
  viewId: { type: String, default: '' },
})

const specState = ref(props.spec)
const listboxRef = ref(null)

const listServerPaging = shallowRef({
  kind: 'read',
  request: props.viewRequest,
  period: { start: null, finish: null },
  limit: 200,
})

watch(
  () => props.viewRequest,
  (r) => {
    listServerPaging.value = {
      kind: 'read',
      request: r,
      period: { start: null, finish: null },
      limit: 200,
    }
  },
  { immediate: true }
)

watch(
  () => props.spec,
  (next) => {
    specState.value = next
    selectedRecordId.value = null
  }
)

watch(
  () => [props.viewRequest, props.viewId],
  () => {
    selectedRecordId.value = null
  }
)

const records = computed(() => (Array.isArray(specState.value?.data) ? specState.value.data : []))
const selectedRecordId = ref(null)
const selectedIndex = computed(() => {
  if (!selectedRecordId.value) return 0
  const idx = records.value.findIndex((r) => r?.recordId === selectedRecordId.value)
  return idx >= 0 ? idx : 0
})
const selectedRecord = computed(() => records.value[selectedIndex.value] ?? null)

const listColumns = computed(() => {
  const controls = Array.isArray(specState.value?.controls) ? specState.value.controls : []
  const fromSpec = controls
    .filter(
      (c) =>
        c &&
        typeof c.name === 'string' &&
        typeof c.header === 'string' &&
        !c.isTabControl &&
        !c.isListbox &&
        !c.isSection
    )
    .map((c) => ({
      name: c.name,
      header: c.header,
      type: typeof c.type === 'string' ? c.type : 'string',
    }))
  if (fromSpec.length > 0) return fromSpec
  return [
    { name: 'id', header: 'ID', type: 'string' },
    { name: 'подр.name', header: 'Подразделение', type: 'string' },
    { name: 'online', header: 'Статус', type: 'string' },
  ]
})

const listboxControl = computed(() => {
  return {
    name: 'recordsList',
    header: 'Записи',
    isListbox: true,
    fillHeight: true,
    query: {
      name: '__records__',
      text: specState.value?.text ?? 'Records',
      columns: listColumns.value,
    },
    serverPaging: listServerPaging.value,
    selectable: true,
    selectedIndex: selectedIndex.value,
    rowKey: 'recordId',
    selectedKey: selectedRecordId.value,
    loading: false,
  }
})

function onSelectRow(payload) {
  const key = payload?.key
  if (typeof key === 'string' && key) selectedRecordId.value = key
}

function onServerResponse(res) {
  const d = Array.isArray(res?.data) ? res.data : []
  specState.value = { ...specState.value, ...res, data: d }
}

async function refreshMainList() {
  await listboxRef.value?.reload?.()
}
</script>

<template>
  <div class="flex h-full min-h-0 gap-4">
    <aside class="flex w-[360px] shrink-0 min-h-0 flex-col">
      <Z8Listbox
        ref="listboxRef"
        :control="listboxControl"
        :record="{}"
        @select-row="onSelectRow"
        @refresh="refreshMainList"
        @server-response="onServerResponse"
      />
    </aside>

    <section class="flex min-w-0 flex-1 min-h-0 flex-col">
      <div v-if="!selectedRecord" class="rounded-lg border bg-white p-4 text-sm text-slate-600">
        Нет записей.
      </div>
      <div v-else class="min-h-0 flex-1 overflow-hidden">
        <Z8Form :spec="specState" :record="selectedRecord" />
      </div>
    </section>
  </div>
</template>
