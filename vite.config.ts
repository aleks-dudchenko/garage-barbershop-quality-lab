import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true, port: 8767, allowedHosts: true },  // host: true = доступ із телефону в тій самій Wi-Fi мережі
  preview: { host: '127.0.0.1', port: 8767 },
})
