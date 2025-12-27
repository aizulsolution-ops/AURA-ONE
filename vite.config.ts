import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // 1. Carrega variáveis de arquivos .env (local)
    const envFile = loadEnv(mode, process.cwd(), '');

    // 2. BUSCA ROBUSTA (A CORREÇÃO)
    // Prioriza process.env (Vercel System Env) sobre o arquivo .env
    // Isso garante que a variável definida no painel da Vercel seja pega
    const GET_VAR = (key: string) => 
      process.env[key] || envFile[key] || '';

    const REAL_API_KEY = GET_VAR('VITE_GEMINI_API_KEY') || GET_VAR('GEMINI_API_KEY');
    const SUPABASE_URL = GET_VAR('VITE_SUPABASE_URL') || GET_VAR('SUPABASE_URL');
    const SUPABASE_KEY = GET_VAR('VITE_SUPABASE_ANON_KEY') || GET_VAR('SUPABASE_ANON_KEY');

    console.log('--- VERCEL BUILD DEBUG V2 ---');
    console.log('Mode:', mode);
    console.log('Gemini Key Found:', REAL_API_KEY ? `YES (Len: ${REAL_API_KEY.length})` : 'NO');
    console.log('Supabase URL Found:', SUPABASE_URL ? 'YES' : 'NO');
    console.log('-----------------------------');

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Injeção direta e forçada das variáveis capturadas
        'process.env.API_KEY': JSON.stringify(REAL_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(REAL_API_KEY),
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(REAL_API_KEY),
        
        // Supabase
        'process.env.SUPABASE_URL': JSON.stringify(SUPABASE_URL),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(SUPABASE_KEY),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(SUPABASE_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});