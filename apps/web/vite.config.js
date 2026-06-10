import { defineConfig } from 'vite'
import Uni from '@dcloudio/vite-plugin-uni'
import Automator from '@dcloudio/uni-automator/lib/uni.plugin.js'

export default defineConfig({
  plugins: [
    ...Automator,
    Uni()
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
