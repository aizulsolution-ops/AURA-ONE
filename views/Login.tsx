/* src/views/Login.tsx */
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { UserRole } from '../types';
import { 
  Mail, 
  Lock, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  Globe, 
  Settings2,
  ShieldCheck
} from 'lucide-react';

interface Props {
  onLoginSuccess: (role: UserRole) => void;
}

const Login: React.FC<Props> = ({ onLoginSuccess }) => {
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
    e.preventDefault(); // Impede refresh da página
    setLoading(true);
    setError(null);

    // Constrói o e-mail final baseado na preferência do usuário
    const finalEmail = useDefaultDomain 
      ? `${emailPrefix}${DEFAULT_DOMAIN}`.toLowerCase().trim()
      : emailPrefix.toLowerCase().trim();

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password: password,
      });

      if (authError) throw authError;

      // O AuthContext cuidará do redirecionamento baseado na role
      // apenas emitimos o sucesso aqui se necessário.
    } catch (err: any) {
      console.error('Erro de login:', err);
      setError(err.message === 'Invalid login credentials' 
        ? 'E-mail ou senha incorretos.' 
        : 'Falha na conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-in">
        
        {/* LOGO E TEXTO INICIAL */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <span className="text-white text-3xl font-bold italic">A</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">AIZUL AURA ONE</h1>
          <p className="text-slate-500 text-sm">Sistema de Gestão de Clínicas</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8">
            
            {/* FORMULÁRIO COM GATILHO DE ENTER */}
            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* CAMPO DE E-MAIL COM DOMÍNIO FIXO/VARIÁVEL */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail</label>
                  <button 
                    type="button"
                    onClick={() => {
                        setUseDefaultDomain(!useDefaultDomain);
                        setEmailPrefix(''); // Limpa para evitar confusão ao trocar modo
                    }}
                    className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${useDefaultDomain ? 'text-blue-600' : 'text-orange-500'}`}
                  >
                    <Settings2 size={12} />
                    {useDefaultDomain ? 'Usar domínio personalizado' : 'Usar domínio padrão'}
                  </button>
                </div>
                
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all overflow-hidden">
                    <input 
                      autoFocus
                      type={useDefaultDomain ? "text" : "email"}
                      placeholder={useDefaultDomain ? "Usuário" : "email@exemplo.com"}
                      className="w-full bg-transparent py-4 pl-12 pr-4 outline-none text-slate-700 font-medium placeholder:text-slate-300"
                      value={emailPrefix}
                      onChange={(e) => setEmailPrefix(e.target.value)}
                      required
                    />
                    {useDefaultDomain && (
                      <span className="bg-slate-200/50 text-slate-500 px-3 py-1 mr-2 rounded-lg text-xs font-bold pointer-events-none select-none">
                        {DEFAULT_DOMAIN}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CAMPO DE SENHA */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Senha</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-12 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-700 font-medium placeholder:text-slate-300"
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
                  <XCircle size={14} />
                  {error}
                </div>
              )}

              {/* BOTÃO DE ENTRAR */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Acessar Sistema
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-between">
              <button className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors">Esqueceu a senha?</button>
              <div className="flex items-center gap-2 text-emerald-600">
                <Globe size={14} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Portal do Paciente</span>
              </div>
            </div>

          </div>
          
          {/* RODAPÉ DE SEGURANÇA */}
          <div className="bg-slate-50 border-t border-slate-100 p-4 text-center">
             <div className="flex items-center justify-center gap-2 text-slate-400">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-bold uppercase">Protegido por Criptografia SSL 256-bit</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente simples para ícone de erro (utilitário local)
const XCircle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);

export default Login;