import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Em desenvolvimento (npm run dev) não há funções serverless rodando,
        // então o próprio Vite faz o proxy para a Magalu. O caminho /api/magalu
        // é o mesmo usado em produção (função em /api/magalu/[...path].ts no Vercel),
        // mantendo o front idêntico nos dois ambientes.
        proxy: {
          '/api/magalu': {
            target: 'https://api.magalu.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/api\/magalu/, ''),
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
