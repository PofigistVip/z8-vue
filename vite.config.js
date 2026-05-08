import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/request.json': {
        target: 'http://localhost:9080',
        changeOrigin: true,
      },
    },
  },
})
