<script setup>
import { inject } from 'vue'

import ManagerFilePreviewForm from '../ManagerFilePreviewForm.vue'
import ManagerDocumentsTabletActionBar from './ManagerDocumentsTabletActionBar.vue'
import ManagerDocumentsTabletHeader from './ManagerDocumentsTabletHeader.vue'
import ManagerDocumentsTabletListPanel from './ManagerDocumentsTabletListPanel.vue'
import { MANAGER_DOCUMENTS_VIEW_KEY } from './constants.js'

const {
  client,
  selectedSectionId,
  selectedRecord,
  hasMainListSelection,
  sectionsLoading,
  sectionsError,
} = inject(MANAGER_DOCUMENTS_VIEW_KEY)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-slate-50">
    <ManagerDocumentsTabletHeader />

    <div
      class="grid min-h-0 flex-1 grid-cols-[minmax(220px,28%)_minmax(0,1fr)] gap-3 px-3 pb-3 pt-3"
    >
      <ManagerDocumentsTabletListPanel />

      <div class="flex min-h-0 min-w-0 flex-col gap-3">
        <div
          class="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          <ManagerFilePreviewForm
            v-if="selectedRecord && selectedSectionId"
            :record="selectedRecord"
            :client-session="String(client?._http?.session ?? '')"
          />
          <div
            v-else-if="!sectionsLoading && !sectionsError"
            class="flex h-full items-center justify-center text-sm text-slate-600"
          >
            {{ selectedSectionId ? 'Выберите запись.' : 'Выберите раздел.' }}
          </div>
        </div>

        <ManagerDocumentsTabletActionBar :has-selection="hasMainListSelection" />
      </div>
    </div>
  </div>
</template>
