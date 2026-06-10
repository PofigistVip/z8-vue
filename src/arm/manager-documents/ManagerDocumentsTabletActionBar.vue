<script setup>
import { inject } from 'vue'

import { MANAGER_DOCUMENTS_VIEW_KEY } from './constants.js'
import ManagerDocumentsRecordOperations from './ManagerDocumentsRecordOperations.vue'

const {
  hasMainListSelection,
  selectedRecord,
  recordOperations,
  openRecordOperation,
  operationSubmitting,
} = inject(MANAGER_DOCUMENTS_VIEW_KEY)
</script>

<template>
  <div class="flex shrink-0 gap-3">
    <ManagerDocumentsRecordOperations
      :operations="recordOperations"
      :disabled="!hasMainListSelection"
      :submitting="operationSubmitting"
      stretch
      @run="(op) => openRecordOperation(selectedRecord, op)"
    />
  </div>
</template>
