import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the bundle loads from the APK's local web root
export default defineConfig({ base: './', plugins: [react()], server: { port: 5199, host: true } })
