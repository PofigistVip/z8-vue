<script setup>
import { formatZ8CellValue } from '../../z8/z8Format.js'

const emit = defineEmits(['click'])

const props = defineProps({
  row: { type: Object, required: true },
  rowIndex: { type: Number, required: true },
  columns: { type: Array, required: true },
  selectable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
})

function formatCellValue(col, raw) {
  return formatZ8CellValue(raw, col?.type)
}

function onClick() {
  emit('click', props.row, props.rowIndex)
}
</script>

<template>
  <tr
    :class="[
      selected
        ? 'bg-sky-100 ring-1 ring-inset ring-sky-300'
        : rowIndex % 2 === 1
          ? 'bg-white'
          : '',
      selectable
        ? ['cursor-pointer', !selected ? 'hover:bg-slate-100' : '']
        : '',
    ]"
    @click="onClick"
  >
    <td
      v-for="(c, cidx) in columns"
      :key="c?.name ?? cidx"
      class="border-b border-slate-200 px-2 py-1 text-xs text-slate-800"
    >
      <span class="whitespace-nowrap">{{ formatCellValue(c, row?.[c?.name]) }}</span>
    </td>
  </tr>
</template>
