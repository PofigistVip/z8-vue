<script setup>
defineProps({
  hasSelection: { type: Boolean, default: false },
})
</script>

<template>
  <div class="flex shrink-0 gap-3">
    <button
      type="button"
      class="group inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors enabled:cursor-pointer enabled:border-emerald-300 enabled:bg-emerald-50 enabled:text-emerald-800 enabled:hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
      :disabled="!hasSelection"
    >
      <svg
        class="h-4 w-4 shrink-0 text-emerald-600 group-disabled:text-slate-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
          clip-rule="evenodd"
        />
      </svg>
      Согласовать
    </button>
    <button
      type="button"
      class="group inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors enabled:cursor-pointer enabled:border-red-300 enabled:bg-red-50 enabled:text-red-800 enabled:hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
      :disabled="!hasSelection"
    >
      <svg
        class="h-4 w-4 shrink-0 text-red-600 group-disabled:text-slate-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
        />
      </svg>
      Отклонить
    </button>
  </div>
</template>
