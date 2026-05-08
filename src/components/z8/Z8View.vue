<script setup>
import { computed, ref } from 'vue'

import Z8Form from './Z8Form.vue'
import Z8Listbox from './Z8Listbox.vue'
import { Z8Client } from '../../z8/z8Client.js'

const props = defineProps({
  spec: { type: Object, required: true },
})

const specState = ref(props.spec)
const records = computed(() => Array.isArray(specState.value?.data) ? specState.value.data : [])
const selectedRecordId = ref(null)
const selectedIndex = computed(() => {
  if (!selectedRecordId.value) return 0
  const idx = records.value.findIndex((r) => r?.recordId === selectedRecordId.value)
  return idx >= 0 ? idx : 0
})
const selectedRecord = computed(() => records.value[selectedIndex.value] ?? null)
const listLoading = ref(false)

const client = new Z8Client()

const listboxControl = computed(() => {
  const columns = [
    { name: 'id', header: 'ID', type: 'string' },
    { name: 'подр.name', header: 'Подразделение', type: 'string' },
    { name: 'online', header: 'Статус', type: 'string' },
  ]

  return {
    name: 'recordsList',
    header: 'Записи',
    isListbox: true,
    fillHeight: true,
    query: {
      name: '__records__',
      text: specState.value?.text ?? 'Records',
      columns,
    },
    data: records.value,
    selectable: true,
    selectedIndex: selectedIndex.value,
    rowKey: 'recordId',
    selectedKey: selectedRecordId.value,
    loading: listLoading.value,
  }
})

function onSelectRow(payload) {
  const key = payload?.key
  if (typeof key === 'string' && key) selectedRecordId.value = key
}

async function refreshMainList() {
  if (listLoading.value) return
  listLoading.value = true
  try {
    const res = await client.read({
      request: 'ru.moscollector.control.module.cards.view.СчитывателиView',
      period: { start: null, finish: null },
      start: 0,
      limit: 200,
    })

    const nextData = Array.isArray(res?.data) ? res.data : []
    specState.value = { ...specState.value, ...res, data: nextData }

    if (!selectedRecordId.value && nextData[0]?.recordId) selectedRecordId.value = nextData[0].recordId
    if (selectedRecordId.value && !nextData.some((r) => r?.recordId === selectedRecordId.value)) {
      selectedRecordId.value = nextData[0]?.recordId ?? null
    }
  } finally {
    listLoading.value = false
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 gap-4">
    <aside class="flex w-[360px] shrink-0 min-h-0 flex-col">
      <Z8Listbox
        :control="listboxControl"
        :record="{}"
        @select-row="onSelectRow"
        @refresh="refreshMainList"
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

