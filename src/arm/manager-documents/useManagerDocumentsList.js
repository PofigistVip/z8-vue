import { computed, nextTick, ref, shallowRef, watch } from 'vue'

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

export function useManagerDocumentsList(props, listBeforeRequest) {
  const specState = ref(props.spec)
  const recordsListRef = ref(null)
  const listboxRecord = {}
  const selectedRecordId = ref(null)

  function buildListServerPaging(request) {
    const paging = {
      kind: 'read',
      request,
      period: { start: null, finish: null },
      limit: 200,
    }
    if (typeof listBeforeRequest === 'function') {
      paging.beforeRequest = listBeforeRequest
    }
    return paging
  }

  const listServerPaging = shallowRef(buildListServerPaging(props.viewRequest))

  watch(
    () => [props.viewRequest, listBeforeRequest],
    () => {
      listServerPaging.value = buildListServerPaging(props.viewRequest)
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

  const selectedIndex = computed(() => {
    if (!selectedRecordId.value) return 0
    const idx = records.value.findIndex((r) => r?.recordId === selectedRecordId.value)
    return idx >= 0 ? idx : 0
  })

  const selectedRecord = computed(() => records.value[selectedIndex.value] ?? null)

  const hasMainListSelection = computed(() => {
    const id = selectedRecordId.value
    if (!id || !records.value.length) return false
    return records.value.some((r) => r?.recordId === id)
  })

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
          !c.isCombobox &&
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

  function onListSelectRow(payload) {
    const key = payload?.key
    if (typeof key === 'string' && key) {
      selectedRecordId.value = key
    } else if (key === undefined) {
      selectedRecordId.value = null
    }
  }

  function onListServerResponse(res) {
    const d = Array.isArray(res?.data) ? res.data : []
    specState.value = { ...specState.value, ...res, data: d }
  }

  async function reloadRecordsList() {
    await nextTick()
    await recordsListRef.value?.reload?.()
  }

  return {
    specState,
    recordsListRef,
    listboxRecord,
    selectedRecordId,
    selectedRecord,
    hasMainListSelection,
    listboxControl,
    onListSelectRow,
    onListServerResponse,
    reloadRecordsList,
  }
}
