<script setup>
import { computed, inject, ref, shallowRef, watch } from 'vue'

import { Z8Client } from '../../z8/z8Client.js'
import Z8ActionParamsDialog from './Z8ActionParamsDialog.vue'
import Z8Form from './Z8Form.vue'
import Z8Listbox from './Z8Listbox.vue'

const injectedClient = inject('z8Client', null)
const client = injectedClient instanceof Z8Client ? injectedClient : new Z8Client()

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
const viewMode = ref('standard')
const listboxRecord = {}

const actionDialogOpen = ref(false)
const pendingAction = shallowRef(null)
const parameterDraft = ref([])
const actionDialogError = ref('')

function closeActionDialog() {
  actionDialogOpen.value = false
  pendingAction.value = null
  parameterDraft.value = []
  actionDialogError.value = ''
}

function resetViewMode() {
  viewMode.value = 'standard'
}

const actionDialogTitle = computed(() => {
  const a = pendingAction.value
  if (!a) return ''
  if (typeof a.header === 'string' && a.header) return a.header
  return typeof a.name === 'string' ? a.name : ''
})

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
    actionError.value = null
    closeActionDialog()
    resetViewMode()
  }
)

watch(
  () => [props.viewRequest, props.viewId],
  () => {
    selectedRecordId.value = null
    actionError.value = null
    closeActionDialog()
    resetViewMode()
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

const isStandardMode = computed(() => viewMode.value === 'standard')
const isTableMode = computed(() => viewMode.value === 'table')

const toolbarActions = computed(() => {
  const raw = Array.isArray(specState.value?.actions) ? specState.value.actions : []
  return raw.filter(
    (a) => a && a.isAction === true && typeof a.name === 'string' && a.name.length > 0
  )
})

const actionSubmitting = ref(false)
const createSubmitting = ref(false)
const destroySubmitting = ref(false)
const actionError = ref(null)

function normalizeColumnList(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((c) => {
      if (!c || typeof c.name !== 'string' || typeof c.header !== 'string') return null
      return {
        name: c.name,
        header: c.header,
        type: typeof c.type === 'string' ? c.type : 'string',
      }
    })
    .filter(Boolean)
}

const tableColumns = computed(() => normalizeColumnList(specState.value?.columns))
const hasTableView = computed(() => tableColumns.value.length > 0)

const listColumns = computed(() => {
  const fromNameFields = normalizeColumnList(specState.value?.nameFields)
  if (fromNameFields.length > 0) return fromNameFields

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

function buildListboxControl({ name, header, columns, queryName }) {
  return {
    name,
    header,
    isListbox: true,
    fillHeight: true,
    query: {
      name: queryName,
      text: specState.value?.text ?? 'Records',
      columns,
    },
    serverPaging: listServerPaging.value,
    selectable: true,
    selectedIndex: selectedIndex.value,
    rowKey: 'recordId',
    selectedKey: selectedRecordId.value,
    loading: false,
  }
}

const listboxControl = computed(() =>
  buildListboxControl({
    name: 'recordsList',
    header: 'Записи',
    columns: listColumns.value,
    queryName: '__records__',
  })
)

const tableListboxControl = computed(() =>
  buildListboxControl({
    name: 'recordsTable',
    header: specState.value?.text ?? 'Записи',
    columns: tableColumns.value,
    queryName: '__table__',
  })
)

function onSelectRow(payload) {
  const key = payload?.key
  if (typeof key === 'string' && key) {
    selectedRecordId.value = key
  } else if (key === undefined) {
    selectedRecordId.value = null
  }
}

function onServerResponse(res) {
  const d = Array.isArray(res?.data) ? res.data : []
  specState.value = { ...specState.value, ...res, data: d }
}

async function refreshMainList() {
  await listboxRef.value?.reload?.()
}

function cloneActionParameters(list) {
  try {
    return JSON.parse(JSON.stringify(list))
  } catch {
    return []
  }
}

async function executeAction(action, parameters) {
  const rid = selectedRecordId.value
  if (!rid || typeof action?.name !== 'string') return
  actionError.value = null
  actionDialogError.value = ''
  actionSubmitting.value = true
  try {
    const req =
      typeof action.request === 'string' && action.request.trim()
        ? action.request.trim()
        : props.viewRequest
    await client.action({
      request: req,
      name: action.name,
      records: [rid],
      parameters: Array.isArray(parameters) ? parameters : [],
    })
    await refreshMainList()
    closeActionDialog()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (actionDialogOpen.value) actionDialogError.value = msg
    else actionError.value = msg
  } finally {
    actionSubmitting.value = false
  }
}

function runToolbarAction(action) {
  const rid = selectedRecordId.value
  if (!rid || typeof action?.name !== 'string') return
  actionError.value = null
  if (Array.isArray(action.parameters) && action.parameters.length > 0) {
    pendingAction.value = action
    parameterDraft.value = cloneActionParameters(action.parameters)
    actionDialogOpen.value = true
    actionDialogError.value = ''
    return
  }
  void executeAction(action, [])
}

function onActionDialogSubmit() {
  const a = pendingAction.value
  if (!a) return
  void executeAction(a, parameterDraft.value)
}

function onActionDialogCancel() {
  closeActionDialog()
}

function isToolbarActionDisabled(action) {
  return (
    actionSubmitting.value ||
    createSubmitting.value ||
    destroySubmitting.value ||
    Boolean(action?.readOnly) ||
    !selectedRecordId.value
  )
}

function removeRecordFromState(recordId) {
  const prev = Array.isArray(specState.value?.data) ? specState.value.data : []
  specState.value = {
    ...specState.value,
    data: prev.filter((r) => r?.recordId !== recordId),
  }
}

function prependRecordToState(newRecord) {
  const rid = newRecord?.recordId
  if (!rid) throw new Error('Create response has no recordId')
  const prev = Array.isArray(specState.value?.data) ? specState.value.data : []
  specState.value = {
    ...specState.value,
    data: [newRecord, ...prev.filter((r) => r?.recordId !== rid)],
  }
}

async function createNewRecord() {
  actionError.value = null
  createSubmitting.value = true
  try {
    const res = await client.create({ request: props.viewRequest })
    const newRecord = res?.data?.[0]
    if (!newRecord || typeof newRecord.recordId !== 'string') {
      throw new Error('Create response has no record')
    }
    prependRecordToState(newRecord)
    listboxRef.value?.prependRow?.(newRecord)
    selectedRecordId.value = newRecord.recordId
    viewMode.value = 'standard'
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : String(e)
  } finally {
    createSubmitting.value = false
  }
}

async function destroySelectedRecord() {
  const rid = selectedRecordId.value
  if (!rid) return
  actionError.value = null
  destroySubmitting.value = true
  try {
    await client.destroy({
      request: props.viewRequest,
      data: [{ recordId: rid }],
    })
    removeRecordFromState(rid)
    listboxRef.value?.removeRow?.(rid)
    const remaining = Array.isArray(specState.value?.data) ? specState.value.data : []
    selectedRecordId.value = remaining[0]?.recordId ?? null
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : String(e)
  } finally {
    destroySubmitting.value = false
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-2">
    <div class="shrink-0 flex flex-col gap-2">
      <div
        class="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
      >
        <button
          type="button"
          class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="createSubmitting || destroySubmitting || actionSubmitting"
          @click="createNewRecord"
        >
          {{ createSubmitting ? 'Создание…' : 'Новая запись' }}
        </button>

        <button
          type="button"
          class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!selectedRecordId || createSubmitting || destroySubmitting || actionSubmitting"
          @click="destroySelectedRecord"
        >
          {{ destroySubmitting ? 'Удаление…' : 'Удалить запись' }}
        </button>

        <div
          class="inline-flex rounded-md border border-slate-300 p-0.5"
          role="group"
          aria-label="Режим отображения"
        >
          <button
            type="button"
            class="rounded px-3 py-1.5 text-sm font-medium transition-colors"
            :class="
              isStandardMode
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-50'
            "
            @click="viewMode = 'standard'"
          >
            Стандартная
          </button>
          <button
            type="button"
            class="rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              isTableMode
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-50'
            "
            :disabled="!hasTableView"
            @click="viewMode = 'table'"
          >
            Табличная
          </button>
        </div>

        <button
          v-for="(act, idx) in toolbarActions"
          :key="`${act.name}-${idx}`"
          type="button"
          class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isToolbarActionDisabled(act)"
          @click="runToolbarAction(act)"
        >
          {{ typeof act.header === 'string' && act.header ? act.header : act.name }}
        </button>
      </div>
      <div
        v-if="actionError"
        class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
      >
        {{ actionError }}
      </div>
    </div>

    <div v-if="isStandardMode" class="flex min-h-0 flex-1 gap-4">
      <aside class="flex w-[360px] shrink-0 min-h-0 flex-col">
        <Z8Listbox
          :key="viewMode"
          ref="listboxRef"
          :control="listboxControl"
          :record="listboxRecord"
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

    <div v-else class="flex min-h-0 flex-1 flex-col">
      <Z8Listbox
        :key="viewMode"
        ref="listboxRef"
        :control="tableListboxControl"
        :record="listboxRecord"
        @select-row="onSelectRow"
        @refresh="refreshMainList"
        @server-response="onServerResponse"
      />
    </div>

    <Z8ActionParamsDialog
      v-model="actionDialogOpen"
      :title="actionDialogTitle"
      :parameters="parameterDraft"
      :submitting="actionSubmitting"
      :error="actionDialogError"
      @submit="onActionDialogSubmit"
      @cancel="onActionDialogCancel"
    />
  </div>
</template>
