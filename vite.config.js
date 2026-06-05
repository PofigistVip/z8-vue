import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/request.json': {
        target: 'http://localhost:9080',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://localhost:9080',
        changeOrigin: true,
      },
      '^/storage%2F': {
        target: 'http://localhost:9080',
        changeOrigin: true,
      },
    },
  },
})
