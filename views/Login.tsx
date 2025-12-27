/* src/views/Login.tsx - VERSÃO CLOUD ASSETS (Vertical Logo + Glass Effect) */
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { UserRole } from '../types';
import { 
  Mail, 
  Lock, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  Settings2,
  ShieldCheck,
  Globe
} from 'lucide-react';

interface Props {
  onLoginSuccess: (role: UserRole) => void;
}

const Login: React.FC<Props> = ({ onLoginSuccess }) => {
  // --- ASSETS (SUPABASE CLOUD) ---
  const ASSETS = {
    BACKGROUND: "https://kbjtwbtwvkulhhtsvjec.supabase.co/storage/v1/object/public/clinic-assets/empty-medical-office-with-desktop-pc.jpg",
    LOGO_VERTICAL: "https://kbjtwbtwvkulhhtsvjec.supabase.co/storage/v1/object/public/clinic-assets/logo-full-vertical.png"
  };

  // --- ESTADOS ---
  const [emailPrefix, setEmailPrefix] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Controle de UX
  const [showPassword, setShowPassword] = useState(false);
  const [useDefaultDomain, setUseDefaultDomain] = useState(true);
  const DEFAULT_DOMAIN = '@aizulsolution.com.br';

  // --- LÓGICA DE ACESSO ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const finalEmail = useDefaultDomain 
      ? `${emailPrefix}${DEFAULT_DOMAIN}`.toLowerCase().trim()
      : emailPrefix.toLowerCase().trim();

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password: password,
      });

      if (authError) throw authError;
      // O AuthContext gerencia o redirecionamento
    } catch (err: any) {
      console.error('Erro de login:', err);
      setError(err.message === 'Invalid login credentials' 
        ? 'Credenciais inválidas.' 
        : 'Falha de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      
      {/* 1. CAMADA DE FUNDO (IMAGEM) */}
      <div className="absolute inset-0 z-0">
        <img 
          src={ASSETS.BACKGROUND} 
          alt="Background Clinic" 
          className="w-full h-full object-cover animate-fade-in-slow"
        />
        {/* Máscara Escura para garantir leitura */}
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[3px]"></div>
      </div>

      {/* 3. CONTEÚDO (Z-INDEX ALTO) */}
      <div className="relative z-10 w-full max-w-md p-4 animate-slide-up">
        
        {/* LOGO FLUTUANTE (VERTICAL) */}
        <div className="text-center mb-8 drop-shadow-2xl">
          <div className="flex justify-center mb-4 transform hover:scale-105 transition-transform duration-500">
             <img 
               src={ASSETS.LOGO_VERTICAL} 
               alt="AURA ONE" 
               className="h-40 w-auto object-contain filter drop-shadow-xl" 
             />
          </div>
        </div>

        {/* CARD GLASSMORPHISM */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 overflow-hidden">
          <div className="p-8">
            
            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* CAMPO DE E-MAIL */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Usuário</label>
                  <button 
                    type="button"
                    onClick={() => {
                        setUseDefaultDomain(!useDefaultDomain);
                        setEmailPrefix(''); 
                    }}
                    className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${useDefaultDomain ? 'text-blue-700' : 'text-orange-600'}`}
                  >
                    <Settings2 size={12} />
                    {useDefaultDomain ? 'Domínio Padrão' : 'E-mail Completo'}
                  </button>
                </div>
                
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-600 transition-colors">
                    <Mail size={18} />
                  </div>
                  
                  <div className="flex items-center bg-white/60 border border-slate-300 rounded-xl focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all overflow-hidden shadow-inner">
                    <input 
                      autoFocus
                      type={useDefaultDomain ? "text" : "email"}
                      placeholder={useDefaultDomain ? "seu.usuario" : "nome@clinica.com"}
                      className="w-full bg-transparent py-4 pl-12 pr-4 outline-none text-slate-800 font-bold placeholder:font-normal placeholder:text-slate-400"
                      value={emailPrefix}
                      onChange={(e) => setEmailPrefix(e.target.value)}
                      required
                    />
                    {useDefaultDomain && (
                      <span className="bg-slate-200 text-slate-600 px-3 py-1 mr-2 rounded-lg text-xs font-bold pointer-events-none select-none">
                        {DEFAULT_DOMAIN}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CAMPO DE SENHA */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Senha</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-600 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full bg-white/60 border border-slate-300 rounded-xl py-4 pl-12 pr-12 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-slate-800 font-bold placeholder:font-normal placeholder:text-slate-400 shadow-inner"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* FEEDBACK DE ERRO */}
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  {error}
                </div>
              )}

              {/* BOTÃO DE AÇÃO */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl py-4 font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Entrar no Sistema
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-between">
              <button className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                Problemas de acesso?
              </button>
              <div className="flex items-center gap-2 text-emerald-700 cursor-pointer hover:text-emerald-800 transition-colors">
                <Globe size={14} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Portal do Paciente</span>
              </div>
            </div>

          </div>
          
          {/* RODAPÉ DO CARD */}
          <div className="bg-white/40 border-t border-white/40 p-4 text-center backdrop-blur-md">
             <div className="flex items-center justify-center gap-2 text-slate-500">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-bold uppercase">Ambiente Seguro • SSL 256-bit</span>
             </div>
          </div>
        </div>

        <p className="text-center text-white/60 text-[10px] mt-6 font-medium tracking-wider">
          &copy; 2025 AIZUL SOLUTION. TODOS OS DIREITOS RESERVADOS.
        </p>

      </div>
    </div>
  );
};

export default Login;