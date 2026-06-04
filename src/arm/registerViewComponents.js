import ManagerРуководительДокументыView from './Manager_РуководительДокументыView.vue'

/**
 * Глобальная регистрация view-компонентов по имени `spec.ui` из meta.
 * Незарегистрированные ui в App.vue отображаются через Z8View.
 */
export function registerViewComponents(app) {
  app.component('Manager_РуководительДокументыView', ManagerРуководительДокументыView)
}
