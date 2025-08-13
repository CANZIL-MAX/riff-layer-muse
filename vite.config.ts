import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
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
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          audio: ['@capacitor/filesystem', '@capacitor/share']
        }
      }
    },
    // Ensure proper asset handling for native apps
    assetsDir: 'assets',
    outDir: 'dist'
  },
  define: {
    // Ensure proper environment detection for native apps
    'process.env.NODE_ENV': JSON.stringify(mode),
    '__CAPACITOR__': '"typeof window !== \\"undefined\\" && window.Capacitor"'
  }
}));
