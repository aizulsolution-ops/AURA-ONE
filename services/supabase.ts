import { createClient } from '@supabase/supabase-js';

/**
 * Helper para acessar variáveis de ambiente de forma segura,
 * evitando erros de 'property of undefined' em diferentes ambientes de execução.
 */
const getSafeEnv = (key: string): string => {
  try {
    // Tenta acessar via padrão Vite (import.meta.env)
    const meta = (import.meta as any);
    if (meta && meta.env && meta.env[key]) {
      return meta.env[key];
    }
    
    // Tenta acessar via padrão Node/Webpack (process.env)
    if (typeof process !== 'undefined' && (process as any).env && (process as any).env[key]) {
      return (process as any).env[key];
    }
  } catch (e) {
    // Silencioso: em caso de erro de acesso, retorna vazio
  }
  return '';
};

// Credenciais de Fallback (Garantem o funcionamento do protótipo)
const FALLBACK_URL = 'https://kbjtwbtwvkulhhtsvjec.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtianR3YnR3dmt1bGhodHN2amVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjQzODcsImV4cCI6MjA4MTE0MDM4N30.ssquXgZ5hCGogudERsJ1yJcuNMGQQtAQVDnQY094CL4';

const supabaseUrl = getSafeEnv('VITE_SUPABASE_URL') || FALLBACK_URL;
const supabaseAnonKey = getSafeEnv('VITE_SUPABASE_ANON_KEY') || FALLBACK_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO CRÍTICO: Credenciais do Supabase não configuradas corretamente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});
