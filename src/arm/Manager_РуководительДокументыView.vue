<script setup>
import { provide } from 'vue'

import ManagerDocumentsDesktopLayout from './manager-documents/ManagerDocumentsDesktopLayout.vue'
import ManagerDocumentsOperationCommentDialog from './manager-documents/ManagerDocumentsOperationCommentDialog.vue'
import ManagerDocumentsTabletLayout from './manager-documents/ManagerDocumentsTabletLayout.vue'
import {
  MANAGER_DESKTOP_MIN_WIDTH,
  MANAGER_DOCUMENTS_VIEW_KEY,
} from './manager-documents/constants.js'
import { useManagerDocumentsView } from './manager-documents/useManagerDocumentsView.js'
import { useMinWidth } from './manager-documents/useMinWidth.js'

const props = defineProps({
  spec: { type: Object, required: true },
  viewRequest: { type: String, required: true },
  viewId: { type: String, default: '' },
})

const viewContext = useManagerDocumentsView(props)
provide(MANAGER_DOCUMENTS_VIEW_KEY, viewContext)

const {
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
  closeRecordOperationDialog,
  submitRecordOperation,
} = viewContext

const { matches: isDesktop } = useMinWidth(MANAGER_DESKTOP_MIN_WIDTH)
</script>

<template>
  <ManagerDocumentsDesktopLayout v-if="isDesktop" />
  <ManagerDocumentsTabletLayout v-else />

  <ManagerDocumentsOperationCommentDialog
    v-model="operationDialogOpen"
    v-model:selected-certificate-id="selectedCertificateId"
    :title="operationDialogTitle"
    :required="operationCommentRequired"
    :signature-required="operationSignatureRequired"
    :certificates="certificates"
    :certificates-loading="certificatesLoading"
    :certificates-error="certificatesError ?? ''"
    :submitting="operationSubmitting"
    :error="operationError ?? ''"
    @cancel="closeRecordOperationDialog"
    @submit="submitRecordOperation"
  />
</template>
