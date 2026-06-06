import { inject, nextTick, onMounted, ref } from 'vue'

import { useResizableWidth } from '../../components/z8/useResizableWidth.js'
import { Z8Client } from '../../z8/z8Client.js'
import { SECTIONS_REQUEST } from './constants.js'
import { useManagerDocumentsList } from './useManagerDocumentsList.js'

const TOOLTIP_HIDE_DELAY_MS = 120

export function useManagerDocumentsView(props) {
  const injectedClient = inject('z8Client', null)
  const client = injectedClient instanceof Z8Client ? injectedClient : new Z8Client()

  const z8ViewRef = ref(null)
  const sections = ref([])
  const sectionsLoading = ref(false)
  const sectionsError = ref(null)
  const selectedSectionKey = ref('')
  const selectedSectionId = ref(null)

  const tooltipRow = ref(null)
  const tooltipAnchor = ref(null)
  const tooltipFormatField = ref(null)

  let hideTooltipTimer = null

  function clearHideTooltipTimer() {
    if (hideTooltipTimer !== null) {
      clearTimeout(hideTooltipTimer)
      hideTooltipTimer = null
    }
  }

  function hideRowTooltip() {
    clearHideTooltipTimer()
    tooltipRow.value = null
    tooltipAnchor.value = null
    tooltipFormatField.value = null
    window.removeEventListener('scroll', hideRowTooltip, true)
  }

  function scheduleHideRowTooltip() {
    clearHideTooltipTimer()
    hideTooltipTimer = setTimeout(hideRowTooltip, TOOLTIP_HIDE_DELAY_MS)
  }

  function showRowTooltip(row, formatField, el) {
    if (!el) return
    clearHideTooltipTimer()
    tooltipRow.value = row
    tooltipFormatField.value = formatField
    tooltipAnchor.value = el.getBoundingClientRect()
    window.removeEventListener('scroll', hideRowTooltip, true)
    window.addEventListener('scroll', hideRowTooltip, true)
  }

  function onTooltipHoverEnter() {
    clearHideTooltipTimer()
  }

  function onTooltipHoverLeave() {
    scheduleHideRowTooltip()
  }

  function toggleRowTooltip(row, formatField, el) {
    const current = tooltipRow.value
    const currentId = current?.recordId
    const rowId = row?.recordId
    if (
      current &&
      currentId !== undefined &&
      currentId !== null &&
      rowId !== undefined &&
      rowId !== null &&
      String(currentId) === String(rowId)
    ) {
      hideRowTooltip()
    } else {
      showRowTooltip(row, formatField, el)
    }
  }

  const { width: sectionsWidth, applyDelta: applySectionsDelta } = useResizableWidth(224, {
    min: 160,
    max: 480,
    storageKey: 'z8:panel-width:manager-sections',
  })

  function sectionKey(row, index) {
    const id = row?.recordId
    if (id !== undefined && id !== null && String(id).length > 0) {
      return String(id)
    }
    return `idx:${index}`
  }

  function sectionLabel(row) {
    const text = row?.text
    if (typeof text === 'string' && text.trim()) return text.trim()
    return '—'
  }

  function sectionCount(row) {
    const raw = row?.count
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    if (raw !== undefined && raw !== null && String(raw).length > 0) return String(raw)
    return ''
  }

  function listBeforeRequest(method, payload) {
    const id = selectedSectionId.value
    if (!id) return
    if (method === 'read' || method === 'count') {
      payload.section = id
    }
  }

  function applySectionSelection(row, index) {
    selectedSectionKey.value = sectionKey(row, index)
    const rid = row?.recordId
    selectedSectionId.value =
      rid !== undefined && rid !== null && String(rid).length > 0 ? String(rid) : null
  }

  const listApi = useManagerDocumentsList(props, listBeforeRequest)

  async function reloadMainList() {
    await nextTick()
    await z8ViewRef.value?.reloadMainList?.()
    await listApi.reloadRecordsList()
  }

  function selectSection(row, index) {
    applySectionSelection(row, index)
    void reloadMainList()
  }

  async function loadSections() {
    sectionsLoading.value = true
    sectionsError.value = null
    try {
      const res = await client.read({
        request: SECTIONS_REQUEST,
        fields: ['text', 'count'],
        limit: 500,
        period: { start: null, finish: null },
      })
      const rows = Array.isArray(res?.data) ? res.data : []
      sections.value = rows
      if (rows.length > 0) {
        applySectionSelection(rows[0], 0)
        await reloadMainList()
      } else {
        selectedSectionKey.value = ''
        selectedSectionId.value = null
      }
    } catch (e) {
      sections.value = []
      selectedSectionKey.value = ''
      selectedSectionId.value = null
      sectionsError.value = e instanceof Error ? e.message : String(e)
    } finally {
      sectionsLoading.value = false
    }
  }

  onMounted(() => {
    void loadSections()
  })

  return {
    props,
    client,
    z8ViewRef,
    sections,
    sectionsLoading,
    sectionsError,
    selectedSectionKey,
    selectedSectionId,
    tooltipRow,
    tooltipAnchor,
    tooltipFormatField,
    sectionsWidth,
    applySectionsDelta,
    sectionKey,
    sectionLabel,
    sectionCount,
    listBeforeRequest,
    selectSection,
    showRowTooltip,
    hideRowTooltip,
    toggleRowTooltip,
    scheduleHideRowTooltip,
    onTooltipHoverEnter,
    onTooltipHoverLeave,
    ...listApi,
  }
}
