/* src/components/patients/PatientDesktopRow.tsx */
import React, { useState, useEffect } from 'react';
import { 
  User, MessageCircle, MoreVertical, Edit2, 
  Trash2, FileText, Activity, CreditCard 
} from 'lucide-react';
import { PatientUI } from '../../types';
import { supabase } from '../../services/supabase';

interface Props {
  patient: PatientUI;
  onClick: () => void;
  onOpenRecord: () => void;
  onWhatsApp: (phone: string) => void;
}

export const PatientDesktopRow: React.FC<Props> = ({ patient, onClick, onOpenRecord, onWhatsApp }) => {
  const [insuranceName, setInsuranceName] = useState<string>('');

  // Busca o nome do convênio se tivermos apenas o ID
  useEffect(() => {
    if (patient.insurance_provider_id && !patient.insurance_plan) {
        const fetchInsuranceName = async () => {
            const { data } = await supabase
                .from('insurance_providers')
                .select('name')
                .eq('id', patient.insurance_provider_id)
                .single();
            if (data) setInsuranceName(data.name);
        };
        fetchInsuranceName();
    } else if (patient.insurance_plan) {
        setInsuranceName(patient.insurance_plan); // Se já vier populado
    }
  }, [patient.insurance_provider_id, patient.insurance_plan]);

  // Fallback visual para foto
  const AvatarFallback = () => (
    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
      <User size={20} />
    </div>
  );

  return (
    <div 
      onClick={onClick}
      className="group flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-all cursor-pointer relative"
    >
      {/* 1. PERFIL (Nome + CPF) */}
      <div className="flex items-center gap-4 min-w-[280px]">
        {patient.avatar_url ? (
          <img 
            src={patient.avatar_url} 
            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" 
            alt={patient.name} 
          />
        ) : <AvatarFallback />}
        
        <div>
          <h4 className="font-bold text-slate-700 text-sm truncate uppercase max-w-[200px]">{patient.name}</h4>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
             {patient.cpf || <span className="text-red-300">SEM CPF</span>}
             {patient.age && <span className="text-slate-300">• {patient.age} ANOS</span>}
          </p>
        </div>
      </div>

      {/* 2. CONVÊNIO & CARTEIRINHA (Novo Bloco de Destaque) */}
      <div className="flex-1 flex flex-col justify-center px-4 border-l border-slate-100 h-10">
         {patient.insurance_provider_id ? (
             <div className="flex flex-col">
                 <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 uppercase">
                     <CreditCard size={12} className="text-purple-500"/>
                     {insuranceName || 'CONVÊNIO'}
                 </div>
                 {patient.insurance_card_number && (
                     <span className="text-[10px] text-slate-500 font-mono tracking-wide pl-4.5">
                        CART: {patient.insurance_card_number}
                     </span>
                 )}
             </div>
         ) : (
             <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase">
                 <User size={12}/> PARTICULAR
             </div>
         )}
      </div>

      {/* 3. STATUS CLÍNICO */}
      <div className="flex-1 hidden lg:flex items-center gap-2 px-4 border-l border-slate-100 h-10">
         {patient.active_cycle_title ? (
             <div>
                 <p className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">{patient.active_cycle_title}</p>
                 <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${Math.min(((patient.sessions_used || 0) / (patient.sessions_total || 1)) * 100, 100)}%` }}
                     ></div>
                 </div>
             </div>
         ) : (
             <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-1 rounded uppercase">Sem Plano Ativo</span>
         )}
      </div>

      {/* 4. AÇÕES RÁPIDAS (Hover) */}
      <div className="flex items-center gap-2 pl-4">
        {patient.phone && (
            <button 
                onClick={(e) => { e.stopPropagation(); onWhatsApp(patient.phone!); }}
                className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                title="WhatsApp"
            >
                <MessageCircle size={18} />
            </button>
        )}
        
        <button 
            onClick={(e) => { e.stopPropagation(); onOpenRecord(); }}
            className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
        >
            <Activity size={14} /> PRONTUÁRIO
        </button>
      </div>
    </div>
  );
};