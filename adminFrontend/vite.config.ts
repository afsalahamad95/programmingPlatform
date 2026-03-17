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
      // Proxy LLM/RAG chatbot requests to the Python FastAPI server
      "/llm": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
