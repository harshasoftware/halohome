import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// Plugin to inject build timestamp into service worker
function serviceWorkerTimestamp() {
  return {
    name: 'sw-timestamp',
    writeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (fs.existsSync(swPath)) {
        const timestamp = Date.now().toString();
        let content = fs.readFileSync(swPath, 'utf-8');
        content = content.replace('__BUILD_TIMESTAMP__', timestamp);
        fs.writeFileSync(swPath, content);
        console.log(`✓ Service worker cache version: ${timestamp}`);
      }
    }
  };
}

// React Compiler disabled for React 18 compatibility
// To re-enable with React 19, uncomment the ReactCompilerConfig below
// const ReactCompilerConfig = {
//   target: '19'
// };

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Headers required for SharedArrayBuffer (parallel WASM with Rayon)
    // Using 'credentialless' instead of 'require-corp' for third-party compatibility
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    proxy: {
      '/google-api': {
        target: 'https://places.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/google-api/, ''),
      },
      '/google-maps-api': {
        target: 'https://maps.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/google-maps-api/, ''),
      },
    },
  },
  // Worker configuration for WASM support
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()],
    rollupOptions: {
      // Mark /wasm/ paths as external in workers too
      // Rayon workers load these at runtime from public/wasm/
      external: [/^\/wasm\/.*/],
    },
  },
  optimizeDeps: {
    // Pre-bundle Radix primitives so they don't get hoisted into route chunks,
    // which was causing undefined imports (e.g., createContextScope) in prod.
    include: [
      "@radix-ui/react-context",
      "@radix-ui/react-roving-focus",
      "@radix-ui/react-collection",
      "@radix-ui/react-slot",
      "@radix-ui/react-compose-refs",
    ],
    // SQLite WASM must be excluded - it needs to dynamically load its own workers
    // Pre-bundling breaks its worker loading mechanism
    exclude: ['astro-core', '@sqlite.org/sqlite-wasm'],
  },
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    mode === 'development' && componentTagger(),
    mode === 'production' && serviceWorkerTimestamp(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@stubs/xyflow": path.resolve(__dirname, "./src/stubs/xyflow.tsx"),
    },
  },
  // Build configuration for WASM
  build: {
    target: 'esnext',
    // Split large dependencies into separate chunks for better caching
    // Note: Only split three.js - splitting React separately breaks globe imports
    rollupOptions: {
      // Mark /wasm/ paths as external - they're static files served from public/
      // These are loaded at runtime by Rayon workers, not bundled
      external: [
        /^\/wasm\/.*/,
      ],
      output: {
        manualChunks(id) {
          // Keep Radix primitives together to avoid cross-chunk hoisting issues
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          // Split three.js (largest dep, rarely changes) into its own chunk
          if (id.includes('node_modules/three/')) {
            return 'vendor-three';
          }
          // NOTE: zustand is NOT chunked separately to avoid useShallow bundling issues
          // When zustand was in a separate chunk, useShallow wasn't resolving correctly
          // in the Workspace lazy-loaded component
        },
      },
    },
    // Increase limit to reduce noise (we're aware of large chunks)
    chunkSizeWarningLimit: 1000,
  },
}));
