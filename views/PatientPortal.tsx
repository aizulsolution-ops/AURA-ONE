import React from 'react';
import { Calendar, CreditCard, Clock, LogOut, Home } from 'lucide-react';

interface Props {
    onLogout: () => void;
}

const PatientPortal: React.FC<Props> = ({ onLogout }) => {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 max-w-md mx-auto shadow-2xl overflow-hidden relative">
       {/* Mobile Header */}
       <div className="bg-aura-600 p-6 rounded-b-[2rem] shadow-lg relative z-10">
           <div className="flex justify-between items-center mb-6">
               <h1 className="text-xl font-bold text-white">Olá, Isabella</h1>
               <img src="https://picsum.photos/100/100?random=1" className="w-10 h-10 rounded-full border-2 border-white/50" />
           </div>
           
           {/* Package Balance Card */}
           <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl text-white">
                <p className="text-xs opacity-80 mb-1">Saldo de Pacote Disponível</p>
                <div className="flex justify-between items-end">
                    <span className="text-2xl font-bold">2 Sessões</span>
                    <span className="text-sm bg-white/20 px-2 py-1 rounded">Remoção a Laser</span>
                </div>
           </div>
       </div>

       <div className="p-6 space-y-6">
           {/* Quick Actions */}
           <div className="grid grid-cols-2 gap-4">
               <button className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                   <div className="bg-aura-100 p-3 rounded-full text-aura-600"><Calendar className="w-6 h-6"/></div>
                   <span className="text-sm font-semibold text-slate-700">Agendar</span>
               </button>
               <button className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                   <div className="bg-purple-100 p-3 rounded-full text-purple-600"><Clock className="w-6 h-6"/></div>
                   <span className="text-sm font-semibold text-slate-700">Histórico</span>
               </button>
           </div>

           {/* Next Appointment */}
           <div>
               <h3 className="font-bold text-slate-800 mb-3">Próxima Consulta</h3>
               <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center">
                   <div className="bg-aura-50 p-3 rounded-lg text-center mr-4">
                       <span className="block text-xs font-bold text-aura-600 uppercase">Out</span>
                       <span className="block text-xl font-bold text-slate-800">24</span>
                   </div>
                   <div>
                       <h4 className="font-bold text-slate-800">Manutenção Botox</h4>
                       <p className="text-sm text-slate-500">09:00 • Dra. Alana</p>
                   </div>
               </div>
           </div>
       </div>
       
       {/* Bottom Nav */}
       <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around max-w-md mx-auto">
            <button className="flex flex-col items-center text-aura-600"><Home className="w-6 h-6"/><span className="text-[10px] mt-1">Início</span></button>
            <button className="flex flex-col items-center text-slate-400"><Calendar className="w-6 h-6"/><span className="text-[10px] mt-1">Agenda</span></button>
            <button className="flex flex-col items-center text-slate-400" onClick={onLogout}><LogOut className="w-6 h-6"/><span className="text-[10px] mt-1">Sair</span></button>
       </div>
    </div>
  );
};

export default PatientPortal;