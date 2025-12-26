/* src/components/agenda/AllSpecialtiesModal.tsx - VERSÃO 2.0 (DUPLA AÇÃO) */
import React, { useState } from 'react';
import { LayoutGrid, X, Star, CheckCircle2, AlertCircle, Eye, CalendarPlus, ArrowLeft } from 'lucide-react';

export interface AgendaItem {
  specialty_id: string;
  status: string;
  starts_at: string;
}

export interface SpecialtyConfig {
    id: string;          
    specialty_id: string; 
    name: string;
    capacidade: number;
    short_name?: string; 
    custom_name?: string; 
    color?: string;      
    is_favorite?: boolean; 
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  specialties: SpecialtyConfig[];
  events: AgendaItem[];
  activeSlot: string | null;
  onSelect: (specialtyId: string | null) => void;
  onScheduleRequest: (specialtyId: string) => void;
}

export const AllSpecialtiesModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  specialties, 
  events, 
  activeSlot, 
  onSelect, 
  onScheduleRequest 
}) => {
    // Estado para controlar qual card está "aberto" para decisão
    const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleClose = () => {
        setSelectedSpecId(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={handleClose}>
            <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in" onClick={e => e.stopPropagation()}>
                
                {/* HEADER */}
                <div className={`p-5 border-b flex justify-between items-center ${activeSlot ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                        <h3 className={`font-bold text-xl flex items-center gap-2 ${activeSlot ? 'text-indigo-900' : 'text-slate-800'}`}>
                            <LayoutGrid size={20} className={activeSlot ? 'text-indigo-600' : 'text-slate-500'}/> 
                            {activeSlot ? `Disponibilidade às ${activeSlot}` : 'Painel Geral de Especialidades'}
                        </h3>
                        <p className={`text-xs mt-1 ${activeSlot ? 'text-indigo-600 font-medium' : 'text-slate-500'}`}>
                            Selecione uma especialidade para ver opções.
                        </p>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-white/50 rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
                </div>

                {/* GRID */}
                <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-slate-50/30 custom-scrollbar">
                    {specialties.map((spec) => {
                        // --- CÁLCULO DE VAGAS ---
                        let currentCount = 0;
                        if (activeSlot) {
                            currentCount = events.filter(e => 
                                e.specialty_id === spec.specialty_id && 
                                !['cancelado', 'cancelled', 'canceled', 'no_show'].includes(e.status) &&
                                new Date(e.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) === activeSlot
                            ).length;
                        } else {
                            currentCount = events.filter(e => 
                                e.specialty_id === spec.specialty_id && 
                                !['cancelado', 'cancelled', 'canceled'].includes(e.status)
                            ).length;
                        }

                        const max = spec.capacidade;
                        const isFull = max > 0 && currentCount >= max;
                        const occupancyRate = max > 0 ? (currentCount / max) * 100 : 0;
                        const isSelected = selectedSpecId === spec.id;

                        // --- RENDERIZAÇÃO DO CARD ---
                        return (
                            <div 
                                key={spec.id}
                                className={`
                                    relative rounded-xl text-left h-[120px] transition-all shadow-sm overflow-hidden
                                    ${isSelected 
                                        ? 'bg-white ring-2 ring-blue-500 border-transparent z-10 transform scale-[1.02]' 
                                        : 'bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer'
                                    }
                                    ${isFull && !isSelected ? 'bg-slate-50 opacity-90' : ''}
                                `}
                                onClick={() => !isSelected && setSelectedSpecId(spec.id)}
                            >
                                {isSelected ? (
                                    // === ESTADO B: OPÇÕES DE AÇÃO ===
                                    <div className="flex flex-col h-full animate-fade-in">
                                        <div className="flex items-center justify-between p-2 border-b border-slate-100 bg-slate-50/50">
                                            <span className="text-[10px] font-bold uppercase text-slate-500 truncate max-w-[120px]">{spec.custom_name || spec.name}</span>
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedSpecId(null); }} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                                        </div>
                                        <div className="flex-1 flex gap-2 p-2 items-center justify-center">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onSelect(spec.id); handleClose(); }}
                                                className="flex-1 h-full flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors gap-1 border border-blue-100"
                                                title="Filtrar grade"
                                            >
                                                <Eye size={20}/>
                                                <span className="text-[9px] font-bold uppercase">Ver Grade</span>
                                            </button>
                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); if(!isFull && activeSlot) { onScheduleRequest(spec.id); handleClose(); } }}
                                                disabled={isFull || !activeSlot}
                                                className={`
                                                    flex-1 h-full flex flex-col items-center justify-center rounded-lg transition-colors gap-1 border
                                                    ${isFull || !activeSlot
                                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100'
                                                    }
                                                `}
                                                title={isFull ? "Horário Lotado" : "Novo Agendamento"}
                                            >
                                                {isFull ? <AlertCircle size={20}/> : <CalendarPlus size={20}/>}
                                                <span className="text-[9px] font-bold uppercase">{isFull ? 'Lotado' : 'Agendar'}</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // === ESTADO A: VISUALIZAÇÃO (SEMÁFORO) ===
                                    <div className="p-4 flex flex-col justify-between h-full">
                                        <div className="flex justify-between items-start w-full relative z-10">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isFull ? '#ef4444' : (spec.color || '#cbd5e1') }}></div>
                                                {spec.is_favorite && <Star size={12} className="text-amber-400 fill-amber-400"/>}
                                            </div>
                                            {isFull && <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase border border-red-200">Lotado</span>}
                                            {!isFull && activeSlot && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase border border-emerald-200 flex items-center gap-1"><CheckCircle2 size={10}/> Livre</span>}
                                        </div>
                                        
                                        <div className="relative z-10 mt-1">
                                            <p className={`font-bold text-sm truncate leading-tight ${isFull ? 'text-red-800' : 'text-slate-700'}`}>
                                                {spec.custom_name || spec.name}
                                            </p>
                                        </div>

                                        <div className="relative z-10 mt-auto pt-2">
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{activeSlot ? 'Vagas' : 'Dia'}</span>
                                                <span className={`text-xs font-black ${isFull ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {currentCount}<span className="text-slate-300 text-[10px] font-medium">/{max}</span>
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                    style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};