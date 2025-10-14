import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Security hardening for development server
    cors: {
      origin: mode === 'development' ? true : false,
      credentials: true
    },
    strictPort: true,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize for mobile native apps
    target: 'es2015',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core dependencies
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // UI components
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-ui';
          }
          // Capacitor plugins
          if (id.includes('node_modules/@capacitor')) {
            return 'vendor-capacitor';
          }
          // Audio components (lazy loaded)
          if (id.includes('src/components/Recording') || 
              id.includes('src/components/Audio') ||
              id.includes('src/components/Track')) {
            return 'audio-components';
          }
          // Services
          if (id.includes('src/services')) {
            return 'services';
          }
        }
      }
    },
    // Ensure proper asset handling for native apps
    assetsDir: 'assets',
    outDir: 'dist',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
  // Web Worker support
  worker: {
    format: 'es',
  },
  define: {
    // Ensure proper environment detection for native apps
    'process.env.NODE_ENV': JSON.stringify(mode),
    '__CAPACITOR__': '"typeof window !== \\"undefined\\" && window.Capacitor"'
  }
}));
