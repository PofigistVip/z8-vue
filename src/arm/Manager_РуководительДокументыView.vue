<script setup>
import { provide } from 'vue'

import ManagerDocumentsDesktopLayout from './manager-documents/ManagerDocumentsDesktopLayout.vue'
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

const { matches: isDesktop } = useMinWidth(MANAGER_DESKTOP_MIN_WIDTH)
</script>

<template>
  <ManagerDocumentsDesktopLayout v-if="isDesktop" />
  <ManagerDocumentsTabletLayout v-else />
</template>
