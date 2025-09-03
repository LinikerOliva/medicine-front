// filepath: vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://127.0.0.1:8000';
  const apiBasePath = env.VITE_API_BASE_PATH || '/api';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5174,
      proxy: {
        [apiBasePath]: {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          // Importante para autenticação baseada em cookie durante o desenvolvimento
          // Regrava domínio e caminho dos cookies para o host do Vite (localhost:5173)
          cookieDomainRewrite: {
            // qualquer domínio -> localhost
            '*': 'localhost',
          },
          cookiePathRewrite: {
            '*': '/',
          },
          // Reescreve cabeçalho Location de redireções absolutas do backend (ex.: 302 http://127.0.0.1:8000/..)
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              const loc = proxyRes.headers['location']
              if (loc) {
                try {
                  // Troca a origem do backend pelo caminho base do proxy
                  const newLoc = loc.replace(apiTarget, apiBasePath)
                  proxyRes.headers['location'] = newLoc
                } catch {}
              }
            })
          },
        },
      },
    },
  };
});