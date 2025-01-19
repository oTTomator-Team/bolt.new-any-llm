import { defineConfig } from 'vite';
import { remixVite } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import tsconfigPaths from 'vite-tsconfig-paths';
import nodePolyfills from 'vite-plugin-node-polyfills';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

// Get git hash with fallback
const getGitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'no-git-info';
  }
};

installGlobals();

export default defineConfig({
  define: {
    __COMMIT_HASH: JSON.stringify(getGitHash()),
    __APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
  plugins: [
    remixVite(),
    react(),
    tsconfigPaths(),
    nodePolyfills({
      include: ['node:*'],
    }),
    UnoCSS(),
    optimizeCssModules({ apply: 'build' }),
  ],
  build: {
    outDir: 'build/client',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@remix-run/react',
      'nanostores',
      '@nanostores/react'
    ]
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  envPrefix: ["VITE_","OPENAI_LIKE_API_BASE_URL", "OLLAMA_API_BASE_URL", "LMSTUDIO_API_BASE_URL","TOGETHER_API_BASE_URL"],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});

function chrome129IssuePlugin() {
  return {
    name: 'chrome129IssuePlugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.headers['user-agent']?.match(/Chrom(e|ium)\/([0-9]+)\./);

        if (raw) {
          const version = parseInt(raw[2], 10);

          if (version === 129) {
            res.setHeader('content-type', 'text/html');
            res.end(
              '<body><h1>Please use Chrome Canary for testing.</h1><p>Chrome 129 has an issue with JavaScript modules & Vite local development, see <a href="https://github.com/stackblitz/bolt.new/issues/86#issuecomment-2395519258">for more information.</a></p><p><b>Note:</b> This only impacts <u>local development</u>. `pnpm run build` and `pnpm run start` will work fine in this browser.</p></body>',
            );

            return;
          }
        }

        next();
      });
    },
  };
}
