/* src/components/agenda/DayClosingModal.tsx */
import React, { useState, useEffect } from 'react';
import { 
    X, CheckCircle2, AlertTriangle, Moon, 
    ArrowRight, MessageCircle, Loader2, UserX 
} from 'lucide-react';
import * as agendaService from '../../services/agendaService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    clinicId: string;
    currentDate: Date;
    onSuccess: () => void;
}

export const DayClosingModal: React.FC<Props> = ({ isOpen, onClose, clinicId, currentDate, onSuccess }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Lista final de faltosos para gerar links
    const [absentList, setAbsentList] = useState<any[]>([]);

    const dateStr = currentDate.toISOString().split('T')[0];
    const displayDate = currentDate.toLocaleDateString('pt-BR');

    // Carrega dados ao abrir
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            loadStats();
        }
    }, [isOpen]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await agendaService.getClosingStats(clinicId, dateStr);
            setStats(data);
            // Por padrão, seleciona todos os pendentes para marcar como falta
            setSelectedIds(data.pending.map((p: any) => p.id));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmClosing = async () => {
        if (selectedIds.length === 0) return setStep(2); // Se ninguém pendente, só avança

        setLoading(true);
        try {
            // 1. Marca os selecionados como 'no_show'
            await agendaService.batchUpdateStatus(selectedIds, 'no_show');
            
            // 2. Prepara lista para recuperação
            const absents = stats.pending.filter((p: any) => selectedIds.includes(p.id));
            setAbsentList(absents);
            
            // 3. Atualiza Agenda pai e avança
            onSuccess(); 
            setStep(2);
        } catch (error) {
            alert("Erro ao fechar o dia.");
        } finally {
            setLoading(false);
        }
    };

    const toggleId = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const sendRecoveryMessage = (patient: any) => {
        if (!patient.patient_phone) return alert("Sem telefone cadastrado.");
        
        const firstName = patient.patient_name.split(' ')[0];
        const msg = `Olá ${firstName}, tudo bem? Notamos que não compareceu à sua sessão de hoje (${patient.time}). Aconteceu algo? Estamos à disposição para reagendar!`;
        
        const link = `https://wa.me/55${patient.patient_phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(link, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-indigo-900 p-6 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Moon className="text-yellow-300" /> Fechamento do Dia
                        </h2>
                        <p className="text-indigo-200 text-sm mt-1">Resumo de {displayDate}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 text-indigo-600">
                            <Loader2 size={40} className="animate-spin mb-4" />
                            <p className="font-bold">Analisando Agenda...</p>
                        </div>
                    ) : step === 1 ? (
                        <div className="space-y-6">
                            {/* Resumo Numérico */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-emerald-100 p-3 rounded-xl text-center">
                                    <span className="block text-2xl font-bold text-emerald-700">{stats?.attended}</span>
                                    <span className="text-[10px] uppercase font-bold text-emerald-600">Atendidos</span>
                                </div>
                                <div className="bg-red-100 p-3 rounded-xl text-center">
                                    <span className="block text-2xl font-bold text-red-700">{stats?.canceled}</span>
                                    <span className="text-[10px] uppercase font-bold text-red-600">Cancelados</span>
                                </div>
                                <div className="bg-amber-100 p-3 rounded-xl text-center border-2 border-amber-300">
                                    <span className="block text-2xl font-bold text-amber-700">{stats?.pending?.length}</span>
                                    <span className="text-[10px] uppercase font-bold text-amber-600">Pendentes</span>
                                </div>
                            </div>

                            {/* Lista de Varredura */}
                            {stats?.pending?.length > 0 ? (
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="p-3 bg-amber-50 border-b border-amber-100 flex gap-2 items-center text-amber-800 text-xs font-bold">
                                        <AlertTriangle size={14} />
                                        <span>Confirmar ausência dos pacientes abaixo:</span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {stats.pending.map((p: any) => (
                                            <div key={p.id} onClick={() => toggleId(p.id)} className="flex items-center p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                                                <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center transition-colors ${selectedIds.includes(p.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                    {selectedIds.includes(p.id) && <CheckCircle2 size={14} className="text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-700 text-sm">{p.patient_name}</p>
                                                    <p className="text-xs text-slate-400">{p.time} • Aguardando</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <CheckCircle2 size={32} className="mx-auto mb-2" />
                                    <p className="font-bold">Agenda em dia!</p>
                                    <p className="text-xs opacity-80">Todos os pacientes tiveram status definido.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // STEP 2: RECUPERAÇÃO
                        <div className="space-y-6 animate-fade-in-right">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">Dia Encerrado!</h3>
                                <p className="text-sm text-slate-500">O status dos pacientes foi atualizado.</p>
                            </div>

                            {absentList.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Recuperar Faltas ({absentList.length})</h4>
                                    <div className="space-y-3">
                                        {absentList.map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                                        <UserX size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-700">{p.patient_name}</p>
                                                        <p className="text-xs text-red-500 font-bold">Faltou às {p.time}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => sendRecoveryMessage(p)}
                                                    className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-2 border border-emerald-100"
                                                >
                                                    <MessageCircle size={14} /> Mensagem
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    {step === 1 ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={handleConfirmClosing} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                                Confirmar e Fechar <ArrowRight size={16} />
                            </button>
                        </>
                    ) : (
                        <button onClick={onClose} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all">
                            Concluir
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};