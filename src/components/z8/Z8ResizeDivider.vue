<script setup>
const emit = defineEmits(['resize'])

function onPointerDown(event) {
  event.preventDefault()

  let lastX = event.clientX
  const previousUserSelect = document.body.style.userSelect
  const previousCursor = document.body.style.cursor

  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'

  function onPointerMove(moveEvent) {
    const dx = moveEvent.clientX - lastX
    lastX = moveEvent.clientX
    if (dx) emit('resize', dx)
  }

  function onPointerUp() {
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', onPointerUp)
    document.body.style.userSelect = previousUserSelect
    document.body.style.cursor = previousCursor
  }

  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
}
</script>

<template>
  <div
    role="separator"
    aria-orientation="vertical"
    class="group relative w-1.5 shrink-0 cursor-col-resize self-stretch"
    @pointerdown="onPointerDown"
  >
    <div
      class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-300 transition-colors group-hover:bg-sky-400"
    />
  </div>
</template>
