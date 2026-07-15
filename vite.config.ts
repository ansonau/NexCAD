import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['manifold-3d'] },
  test: { environment: 'node', exclude: ['**/node_modules/**', '**/e2e/**'] },
});
