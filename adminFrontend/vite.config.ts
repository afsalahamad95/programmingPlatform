import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // Proxy all API requests to the backend server
      '/api': {
        target: 'http://localhost:3000', // Backend server URL from README
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
