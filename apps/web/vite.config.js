import { defineConfig } from 'vite'
import Uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [
    Uni()
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
