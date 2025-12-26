import React from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const RecoverPassword: React.FC<Props> = ({ onBack }) => {
  const [sent, setSent] = React.useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
        <button onClick={onBack} className="flex items-center text-slate-400 hover:text-slate-600 mb-6 text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Login
        </button>
        
        {!sent ? (
            <>
                <div className="w-12 h-12 bg-aura-100 text-aura-600 rounded-full flex items-center justify-center mb-4">
                    <LockIcon />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Recuperar Senha</h2>
                <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                    Digite seu endereço de e-mail e enviaremos um link para redefinir sua senha.
                </p>
                <div className="space-y-4">
                    <input 
                        type="email" 
                        placeholder="Digite seu e-mail" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aura-500"
                    />
                    <button 
                        onClick={() => setSent(true)}
                        className="w-full py-3 bg-aura-600 text-white rounded-lg font-semibold hover:bg-aura-700 transition-colors"
                    >
                        Enviar Link de Redefinição
                    </button>
                </div>
            </>
        ) : (
            <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800">Verifique seu e-mail</h3>
                <p className="text-slate-500 mt-2">Enviamos instruções de recuperação de senha para o seu e-mail.</p>
                <button 
                    onClick={onBack}
                    className="mt-6 px-6 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                    Retornar ao Login
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
)

export default RecoverPassword;