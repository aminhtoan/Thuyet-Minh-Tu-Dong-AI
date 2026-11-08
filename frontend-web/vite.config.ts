import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { assertStagingFrontend, stagingRoutingBase } from '../scripts/staging-frontend.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const environment = mode === 'staging' ? process.env : { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  assertStagingFrontend(mode, environment)
  return { plugins: [react(), stagingRoutingBase(mode, environment)], envDir: mode === 'staging' ? false : undefined }
})
