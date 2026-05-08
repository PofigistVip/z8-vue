<script setup>
import Z8View from './components/z8/Z8View.vue'
import z8struct from './mock/z8struct.json'
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
    <header class="shrink-0 border-b bg-white">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div class="min-w-0">
          <div class="truncate text-sm text-slate-500">Dynamic form (Z8)</div>
          <div class="truncate text-lg font-semibold leading-tight">{{ z8struct.text ?? z8struct.ui ?? 'Form' }}</div>
        </div>
      </div>
    </header>

    <main class="mx-auto min-h-0 flex-1 max-w-6xl overflow-hidden px-4 py-6">
      <Z8View :spec="z8struct" />
    </main>
  </div>
</template>
