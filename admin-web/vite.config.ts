import { defineConfig, loadEnv } from 'vite';
import { assertStagingFrontend, stagingRoutingBase } from '../scripts/staging-frontend.mjs';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const environment = mode === 'staging' ? process.env : { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  assertStagingFrontend(mode, environment, true);
  return {
  plugins: [react(), stagingRoutingBase(mode, environment)],
  envDir: mode === 'staging' ? false : undefined,
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
  };
});
