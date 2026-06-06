<script setup>
import { inject } from 'vue'

import { MANAGER_DOCUMENTS_VIEW_KEY } from './constants.js'

inject(MANAGER_DOCUMENTS_VIEW_KEY)
</script>

<template>
  <div class="flex h-full min-h-0 items-center justify-center text-sm text-slate-600">
    Планшетная версия в разработке.
  </div>
</template>
