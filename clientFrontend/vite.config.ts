import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['@monaco-editor/react'],
  },
  build: {
    chunkSizeWarningLimit: 2000, // Monaco editor is large
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor'],
        }
      }
    }
  },
  server: {
    fs: {
      // Allow serving files from node_modules for Monaco editor
      allow: ['..']
    }
  }
});
