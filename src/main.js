import { createApp } from 'vue'

import { registerViewComponents } from './arm/registerViewComponents.js'
import './style.css'
import App from './App.vue'

const app = createApp(App)

registerViewComponents(app)

app.mount('#app')
