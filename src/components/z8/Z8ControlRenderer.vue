<script setup>
import { computed } from 'vue'

import Z8Combobox from './Z8Combobox.vue'
import Z8Field from './Z8Field.vue'
import Z8Section from './Z8Section.vue'
import Z8Tabs from './Z8Tabs.vue'
import Z8Listbox from './Z8Listbox.vue'

const props = defineProps({
  control: { type: Object, required: true },
  record: { type: Object, required: true },
  uiRegistry: { type: Object, default: () => ({}) },
})

const resolvedUiComponent = computed(() => {
  const ui = props.control?.ui
  if (!ui) return null
  return props.uiRegistry?.[ui] ?? null
})

const controlKind = computed(() => {
  if (Boolean(props.control?.isTabControl) && Array.isArray(props.control?.tabs)) return 'tabs'
  if (Boolean(props.control?.isSection) || Array.isArray(props.control?.controls)) return 'section'
  if (Boolean(props.control?.isListbox) || props.control?.ui === 'ControlListbox') return 'listbox'
  if (Boolean(props.control?.isCombobox)) return 'combobox'
  return 'field'
})

const builtInRegistry = {
  tabs: Z8Tabs,
  section: Z8Section,
  listbox: Z8Listbox,
  combobox: Z8Combobox,
  field: Z8Field,
}

const componentToRender = computed(() => resolvedUiComponent.value ?? builtInRegistry[controlKind.value] ?? Z8Field)

const componentProps = computed(() => {
  if (
    (controlKind.value === 'field' || controlKind.value === 'combobox') &&
    !resolvedUiComponent.value
  ) {
    return { control: props.control, record: props.record }
  }
  if (controlKind.value === 'listbox') {
    return { control: props.control, record: props.record, uiRegistry: props.uiRegistry }
  }
  return { control: props.control, record: props.record, uiRegistry: props.uiRegistry }
})
</script>

<template>
  <component :is="componentToRender" v-bind="componentProps" />
</template>

