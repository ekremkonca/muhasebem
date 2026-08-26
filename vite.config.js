import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        root: resolve(process.cwd(), 'index.html'),
        anasayfa: resolve(process.cwd(), 'anasayfa.html'),
        muhasebe: resolve(process.cwd(), 'muhasebe.html'),
        varliklar: resolve(process.cwd(), 'varliklar.html'),
        takvim: resolve(process.cwd(), 'takvim.html')
      }
    }
  }
});
