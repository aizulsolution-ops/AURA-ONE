import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Carrega todas as variáveis de ambiente, incluindo as do sistema (Vercel)
    const env = loadEnv(mode, process.cwd(), '');

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // CORREÇÃO CRÍTICA:
        // Pega a variável VITE_GEMINI_API_KEY (definida na Vercel)
        // E injeta na variável process.env.GEMINI_API_KEY (usada pelo SDK do Google)
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        
        // Garante que funciona também se o código chamar com VITE_
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        
        // Bridge para Supabase (caso necessário)
        'process.env.SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});