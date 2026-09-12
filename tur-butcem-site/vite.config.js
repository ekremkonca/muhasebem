import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        root: resolve(process.cwd(), 'index.html'),
        muhasebe: resolve(process.cwd(), 'muhasebe/index.html'),
        varliklar: resolve(process.cwd(), 'varliklar/index.html'),
        takvim: resolve(process.cwd(), 'takvim/index.html')
      }
    }
  }
});
