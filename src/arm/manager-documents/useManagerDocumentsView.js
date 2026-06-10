import { computed, inject, nextTick, onMounted, ref } from 'vue'

import { useResizableWidth } from '../../components/z8/useResizableWidth.js'
import { getContractorId } from '../../stores/userStore.js'
import { Z8Client } from '../../z8/z8Client.js'
import { SECTIONS_REQUEST } from './constants.js'
import { loadCertificates, signFile } from '../../crypto/useCryptoPro.js'
import {
  buildProcessTaskPayload,
  getRecordWorkflowOperations,
  getSignableFile,
} from './getRecordWorkflowOperations.js'
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
      payload.needFormConfig = true
    }
  }

  function applySectionSelection(row, index) {
    selectedSectionKey.value = sectionKey(row, index)
    const rid = row?.recordId
    selectedSectionId.value =
      rid !== undefined && rid !== null && String(rid).length > 0 ? String(rid) : null
  }

  const listApi = useManagerDocumentsList(props, listBeforeRequest)
  const { selectedRecord } = listApi

  const recordOperations = computed(() =>
    getRecordWorkflowOperations(selectedRecord.value, getContractorId())
  )

  function recordOperationsFor(record) {
    return getRecordWorkflowOperations(record, getContractorId())
  }

  const operationDialogOpen = ref(false)
  const pendingOperation = ref(null)
  const pendingRecord = ref(null)
  const operationSubmitting = ref(false)
  const operationError = ref(null)

  const operationDialogTitle = computed(() => {
    const text = pendingOperation.value?.text
    return typeof text === 'string' && text.trim() ? text.trim() : 'Комментарий'
  })

  const operationCommentRequired = computed(() => pendingOperation.value?.commentRequired === true)
  const operationSignatureRequired = computed(
    () => pendingOperation.value?.signatureRequired === true
  )

  const certificates = ref([])
  const certificatesLoading = ref(false)
  const certificatesError = ref(null)
  const selectedCertificateId = ref('')

  function resetCertificateState() {
    certificates.value = []
    certificatesLoading.value = false
    certificatesError.value = null
    selectedCertificateId.value = ''
  }

  async function loadOperationCertificates() {
    certificatesLoading.value = true
    certificatesError.value = null
    certificates.value = []
    selectedCertificateId.value = ''
    try {
      const certs = await loadCertificates()
      certificates.value = certs
      if (certs.length === 1 && certs[0]?.id) {
        selectedCertificateId.value = String(certs[0].id)
      }
    } catch (e) {
      certificatesError.value =
        e instanceof Error ? e.message : 'Не настроена возможность подписания файлов электронной подписью.'
    } finally {
      certificatesLoading.value = false
    }
  }

  function openRecordOperation(record, operation) {
    if (!record || !operation) return
    pendingRecord.value = record
    pendingOperation.value = operation
    operationError.value = null
    resetCertificateState()
    operationDialogOpen.value = true
    if (operation.signatureRequired) {
      void loadOperationCertificates()
    }
  }

  function closeRecordOperationDialog() {
    operationDialogOpen.value = false
    pendingOperation.value = null
    pendingRecord.value = null
    operationError.value = null
    resetCertificateState()
  }

  async function submitRecordOperation({ comment, certificate } = {}) {
    const record = pendingRecord.value
    const operation = pendingOperation.value
    if (!record || !operation) return

    const trimmed = typeof comment === 'string' ? comment.trim() : ''
    if (operation.commentRequired && !trimmed) {
      operationError.value = 'Введите комментарий.'
      return
    }

    const signatureRequired = operation.signatureRequired === true
    if (signatureRequired && !certificate?.id) {
      operationError.value = 'Выберите сертификат электронной подписи.'
      return
    }

    let extras = null
    if (signatureRequired) {
      const file = getSignableFile(record)
      if (!file) {
        operationError.value = 'Не найден файл для подписи.'
        return
      }

      operationSubmitting.value = true
      operationError.value = null
      try {
        const signature = await signFile(certificate.id, file, client._http.session)
        extras = { signature, fileId: file.id }
      } catch (e) {
        operationError.value = e instanceof Error ? e.message : String(e)
        operationSubmitting.value = false
        return
      }
    }

    const payload = buildProcessTaskPayload(record, operation, trimmed, extras)
    if (!payload) {
      operationError.value = 'Не удалось сформировать запрос операции.'
      if (signatureRequired) operationSubmitting.value = false
      return
    }

    operationSubmitting.value = true
    operationError.value = null
    try {
      await client.processWorkflowTask(payload)
      closeRecordOperationDialog()
      await reloadAfterOperation()
    } catch (e) {
      operationError.value = e instanceof Error ? e.message : String(e)
    } finally {
      operationSubmitting.value = false
    }
  }

  async function reloadMainList() {
    await nextTick()
    await z8ViewRef.value?.reloadMainList?.()
    await listApi.reloadRecordsList()
  }

  async function reloadAfterOperation() {
    await loadSections({ preserveSelection: true })
    await reloadMainList()
  }

  function selectSection(row, index) {
    applySectionSelection(row, index)
    void reloadMainList()
  }

  async function loadSections({ preserveSelection = false } = {}) {
    const previousSectionId = selectedSectionId.value
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
        if (preserveSelection && previousSectionId) {
          const index = rows.findIndex(
            (row) => row?.recordId !== undefined && String(row.recordId) === String(previousSectionId)
          )
          if (index >= 0) {
            applySectionSelection(rows[index], index)
          } else {
            applySectionSelection(rows[0], 0)
          }
        } else {
          applySectionSelection(rows[0], 0)
        }
        if (selectedSectionId.value) {
          await reloadMainList()
        }
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
    recordOperations,
    recordOperationsFor,
    operationDialogOpen,
    operationDialogTitle,
    operationCommentRequired,
    operationSignatureRequired,
    operationSubmitting,
    operationError,
    certificates,
    certificatesLoading,
    certificatesError,
    selectedCertificateId,
    openRecordOperation,
    closeRecordOperationDialog,
    submitRecordOperation,
    ...listApi,
  }
}
