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
  operationSubmitting,
  operationError,
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
    :title="operationDialogTitle"
    :required="operationCommentRequired"
    :submitting="operationSubmitting"
    :error="operationError ?? ''"
    @cancel="closeRecordOperationDialog"
    @submit="submitRecordOperation"
  />
</template>
