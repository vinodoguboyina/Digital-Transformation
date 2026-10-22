import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { solutionsStorePlugin } from './solutions-store.js'

const root = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '')
  for (const key of ['ADMIN_EMPLOYEE_ID', 'ADMIN_USERS', 'SESSION_SECRET']) {
    if (env[key]) process.env[key] = env[key]
  }
  return {
    plugins: [react(), tailwindcss(), solutionsStorePlugin(root)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
