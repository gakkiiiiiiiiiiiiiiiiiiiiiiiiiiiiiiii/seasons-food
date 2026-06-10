import { createApp } from 'vue'
import { Icon } from '@iconify/vue'
import './styles.css'
import App from './App.vue'

createApp(App).component('Icon', Icon).mount('#app')
