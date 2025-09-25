import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: (process.env.VITE_BACKEND_URL || 'https://trust-3.onrender.com').replace(/\/+$/, ''),
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // server proxy removed; all calls go directly to Supabase/Edge
  build: {
    // Generate sourcemaps for better debugging in production
    sourcemap: true,
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          stripe: ['@stripe/react-stripe-js', '@stripe/stripe-js'],
        },
      },
    },
  },
  // Configure preview server for testing builds locally
  preview: {
    port: 4173,
    strictPort: true,
  },
});
