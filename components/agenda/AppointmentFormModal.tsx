/* src/components/agenda/AppointmentFormModal.tsx - VERSÃO 15.0 (SELECTOR MODAL / MINI MODAL) */
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Search, Calendar, User, Clock, CheckCircle2, 
  Trash2, MessageCircle, Loader2, Stethoscope, ChevronDown, Save, Bell, 
  Users, ChevronRight, LayoutGrid
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import * as agendaService from '../../services/agendaService';
import { Patient } from '../../types';

// --- HELPERS ---
const formatBrDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + 
               ' às ' + 
               date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return dateStr; }
};

const toSupabaseTimestamp = (date: string, time: string): string => {
    const timeClean = time.length === 5 ? `${time}:00` : time;
    return `${date}T${timeClean}-03:00`;
};

const addMinutes = (dateStr: string, timeStr: string, minutes: number) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    const dateObj = new Date(y, m - 1, d, h, min);
    dateObj.setMinutes(dateObj.getMinutes() + minutes);
    const newDate = dateObj.toISOString().split('T')[0];
    const newTime = dateObj.toTimeString().split(' ')[0].substring(0, 5); 
    return { date: newDate, time: newTime };
};

// --- SUB-COMPONENTE: MINI MODAL DE SELEÇÃO ---
const SpecialtySelectorModal = ({ isOpen, onClose, specialties, profCounts, onSelect }: any) => {
    const [localSearch, setLocalSearch] = useState('');

    const filtered = useMemo(() => {
        if (!localSearch) return specialties;
        return specialties.filter((s: any) => s.name.toLowerCase().includes(localSearch.toLowerCase()));
    }, [specialties, localSearch]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] animate-scale-in border border-slate-100" onClick={e => e.stopPropagation()}>
                
                {/* Header do Seletor */}
                <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><LayoutGrid size={18} className="text-blue-600"/> Selecionar Especialidade</h4>
                        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400"><X size={18}/></button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/>
                        <input 
                            autoFocus
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold text-slate-600 placeholder:font-normal placeholder:normal-case"
                            placeholder="Filtrar especialidade..."
                            value={localSearch}
                            onChange={e => setLocalSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Lista com Scroll Isolado */}
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-slate-50/50">
                    {filtered.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">Nenhuma especialidade encontrada.</div>
                    ) : (
                        <div className="grid gap-2">
                            {filtered.map((s: any) => (
                                <button 
                                    key={s.id}
                                    onClick={() => { onSelect(s.id); onClose(); }}
                                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group text-left"
                                >
                                    <div>
                                        <p className="font-bold text-sm text-slate-700 group-hover:text-blue-700 uppercase">{s.name}</p>
                                        <div className="flex gap-2 mt-1.5">
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1 font-semibold">
                                                <Users size={10}/> Cap: {s.capacidade}
                                            </span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-semibold ${profCounts[s.specialty_id] ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                <Stethoscope size={10}/> Profs: {profCounts[s.specialty_id] || 0}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500"/>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clinicId: string;
  specialties: any[]; 
  timeSlots: string[]; 
  initialDate?: string;
  initialTime?: string;
  appointmentToEdit?: any | null; 
}

type Step = 1 | 2; 

interface GeneratedSlot {
  id: string; 
  date: string; 
  time: string; 
}

export const AppointmentFormModal: React.FC<Props> = ({ 
  isOpen, onClose, onSuccess, clinicId, specialties, timeSlots, initialDate, initialTime, appointmentToEdit 
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [searchingPatient, setSearchingPatient] = useState(false);

  // --- FORMULÁRIO ---
  const [searchTerm, setSearchTerm] = useState('');
  const [patientsFound, setPatientsFound] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientBalance, setPatientBalance] = useState<{ used: number, total: number } | null>(null);
  
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
  const [professionalsList, setProfessionalsList] = useState<any[]>([]);
  const [loadingProfs, setLoadingProfs] = useState(false);
  const [receptionNotes, setReceptionNotes] = useState('');

  // ESTADO PARA O MINI MODAL
  const [showSpecSelector, setShowSpecSelector] = useState(false);
  const [profCounts, setProfCounts] = useState<Record<string, number>>({});

  // Datas
  const [startDate, setStartDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(initialTime || (timeSlots[0] || '08:00'));
  
  // Recorrência
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState(1); 
  const [recurrenceFreq, setRecurrenceFreq] = useState<'daily' | 'alternate' | 'weekly'>('daily');
  
  const [generatedSlots, setGeneratedSlots] = useState<GeneratedSlot[]>([]);
  const [whatsappMessage, setWhatsappMessage] = useState('');

  const availableSpecialties = useMemo(() => {
    return specialties
      .filter((s: any) => s.capacidade > 0)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [specialties]);

  const selectedSpecialtyObj = useMemo(() => 
    availableSpecialties.find((s:any) => s.id === selectedSpecialtyId), 
  [selectedSpecialtyId, availableSpecialties]);

  // --- CARREGA CONTAGEM DE PROFISSIONAIS ---
  useEffect(() => {
    if (isOpen && clinicId) {
        const fetchProfCounts = async () => {
            const { data } = await supabase
                .from('professional_specialties')
                .select('specialty_id')
                .eq('clinic_id', clinicId)
                .eq('is_active', true);

            if (data) {
                const counts: Record<string, number> = {};
                data.forEach((item: any) => {
                    const specId = item.specialty_id;
                    if (!counts[specId]) counts[specId] = 0;
                    counts[specId]++; 
                });
                setProfCounts(counts);
            }
        };
        fetchProfCounts();
    }
  }, [isOpen, clinicId]);

  // --- CARREGAR DADOS DE EDIÇÃO ---
  useEffect(() => {
    if (appointmentToEdit) {
        setStartDate(appointmentToEdit.starts_at.split('T')[0]);
        setStartTime(new Date(appointmentToEdit.starts_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}));
        setSelectedSpecialtyId(appointmentToEdit.specialty_id);
        setSelectedProfessionalId(appointmentToEdit.assigned_to_profile_id || ''); 
        setReceptionNotes(appointmentToEdit.reception_alert || '');
        
        setSelectedPatient({
            id: appointmentToEdit.patient_id,
            name: appointmentToEdit.patient_name,
            phone: appointmentToEdit.patient_phone
        } as Patient);
        
        setGeneratedSlots([{
            id: appointmentToEdit.id,
            date: appointmentToEdit.starts_at.split('T')[0],
            time: new Date(appointmentToEdit.starts_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
        }]);
    }
  }, [appointmentToEdit]);

  // --- BUSCA PACIENTE ---
  useEffect(() => {
    if (appointmentToEdit) return; 
    const timer = setTimeout(async () => {
      if (searchTerm.length >= 1) {
        setSearchingPatient(true);
        const { data } = await supabase.from('patients').select('*').eq('clinic_id', clinicId).ilike('name', `%${searchTerm}%`).limit(5);
        setPatientsFound(data || []);
        setSearchingPatient(false);
      } else { setPatientsFound([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, clinicId, appointmentToEdit]);

  // --- CARREGA PROFISSIONAIS ---
  useEffect(() => {
    if (selectedSpecialtyId) {
      const selectedSpec = availableSpecialties.find((s:any) => s.id === selectedSpecialtyId);
      const targetSpecId = selectedSpec?.specialty_id || selectedSpecialtyId; 
      
      const fetchProfs = async () => {
        setLoadingProfs(true);
        try {
            const { data: relData, error: relError } = await supabase
                .from('professional_specialties')
                .select('profile_id') 
                .eq('clinic_id', clinicId)
                .eq('specialty_id', targetSpecId);
            
            if (relError || !relData || relData.length === 0) {
                 const { data: directProfs } = await supabase.from('profiles').select('id, name').eq('specialty_id', targetSpecId).eq('clinic_id', clinicId);
                 setProfessionalsList(directProfs || []);
            } else {
                const profIds = relData.map((r: any) => r.profile_id || r.professional_id).filter(Boolean);
                if (profIds.length > 0) {
                    const { data: profs } = await supabase.from('profiles').select('id, name').in('id', profIds);
                    setProfessionalsList(profs || []);
                } else {
                    setProfessionalsList([]);
                }
            }
        } catch (e) {
            console.error("Erro ao buscar profissionais", e);
            setProfessionalsList([]);
        } finally {
            setLoadingProfs(false);
        }
      };
      fetchProfs();
    } else { setProfessionalsList([]); }
  }, [selectedSpecialtyId, availableSpecialties, clinicId]);

  // --- GERA SLOTS ---
  const handleGenerateSlots = () => {
    if (appointmentToEdit) return; 

    const slots: GeneratedSlot[] = [];
    const [y, m, d] = startDate.split('-').map(Number);
    let currentDate = new Date(y, m - 1, d); 
    const count = isRecurrent ? recurrenceCount : 1;
    let added = 0, attempts = 0;

    while (added < count && attempts < 100) {
        attempts++;
        const dayOfWeek = currentDate.getDay(); 
        if (dayOfWeek === 0) { currentDate.setDate(currentDate.getDate() + 1); continue; }
        if (recurrenceFreq === 'daily' && dayOfWeek === 6) { currentDate.setDate(currentDate.getDate() + 2); continue; }

        const yStr = currentDate.getFullYear();
        const mStr = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dStr = String(currentDate.getDate()).padStart(2, '0');
        const dateString = `${yStr}-${mStr}-${dStr}`;

        slots.push({ id: Math.random().toString(36).substr(2, 9), date: dateString, time: startTime });
        added++;
        if (!isRecurrent) break;
        if (recurrenceFreq === 'daily') currentDate.setDate(currentDate.getDate() + 1);
        else if (recurrenceFreq === 'alternate') currentDate.setDate(currentDate.getDate() + 2); 
        else if (recurrenceFreq === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
    }
    setGeneratedSlots(slots);
  };

  useEffect(() => { 
      if (!appointmentToEdit) handleGenerateSlots(); 
  }, [startDate, startTime, isRecurrent, recurrenceCount, recurrenceFreq, appointmentToEdit]);

  const updateSlot = (id: string, field: 'date' | 'time', value: string) => {
    setGeneratedSlots(prev => prev.map(slot => slot.id === id ? { ...slot, [field]: value } : slot));
  };

  const removeSlot = (id: string) => setGeneratedSlots(prev => prev.filter(s => s.id !== id));

  const handleConfirm = async () => {
    if (!selectedPatient || !selectedSpecialtyId) return;
    setSaving(true);
    try {
        const selectedSpec = availableSpecialties.find((s:any) => s.id === selectedSpecialtyId);
        const realSpecialtyId = selectedSpec?.specialty_id || selectedSpecialtyId;

        if (appointmentToEdit) {
            const slot = generatedSlots[0]; 
            const startTimestamp = toSupabaseTimestamp(slot.date, slot.time);
            const endData = addMinutes(slot.date, slot.time, 40);
            const endTimestamp = toSupabaseTimestamp(endData.date, endData.time);

            const { error } = await supabase.from('agenda_events').update({
                specialty_id: realSpecialtyId,
                assigned_to_profile_id: selectedProfessionalId === '' ? null : selectedProfessionalId,
                start_at: startTimestamp,
                end_at: endTimestamp,
                reception_alert: receptionNotes || null
            }).eq('id', appointmentToEdit.id);

            if (error) throw error;
            
            const msg = `Olá *${selectedPatient.name.split(' ')[0]}*! \nSeu agendamento foi alterado para: *${formatBrDate(slot.date + 'T' + slot.time)}*.\nObrigado!`;
            setWhatsappMessage(msg);

        } else {
            const promises = generatedSlots.map(slot => {
                const startTimestamp = toSupabaseTimestamp(slot.date, slot.time);
                const endData = addMinutes(slot.date, slot.time, 40);
                const endTimestamp = toSupabaseTimestamp(endData.date, endData.time);

                return agendaService.createSingleAppointment({
                    clinic_id: clinicId,
                    patient_id: selectedPatient.id,
                    specialty_id: realSpecialtyId,
                    assigned_to_profile_id: selectedProfessionalId === '' ? null : selectedProfessionalId, 
                    title: 'Sessão',
                    start_at: startTimestamp, 
                    end_at: endTimestamp,
                    status: 'scheduled',
                    reception_alert: receptionNotes || null
                });
            });
            await Promise.all(promises);
            
            const datesList = generatedSlots.map(s => `🗓️ ${formatBrDate(s.date + 'T' + s.time)}`).join('\n');
            const msg = `Olá *${selectedPatient.name.split(' ')[0]}*! \nConfirmamos seu agendamento de *${selectedSpec?.name}*.\n\nDatas:\n${datesList}\n\nObrigado!`;
            setWhatsappMessage(msg);
        }

        setStep(2); 
    } catch (error: any) { alert(`Erro ao salvar: ${error.message}`); } finally { setSaving(false); }
  };

  const sendWhatsApp = () => {
    if (!selectedPatient?.phone) return alert("Paciente sem telefone.");
    const cleanPhone = selectedPatient.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
      
      {/* MINI MODAL (RENDERIZADO CONDICIONALMENTE) */}
      <SpecialtySelectorModal 
        isOpen={showSpecSelector}
        onClose={() => setShowSpecSelector(false)}
        specialties={availableSpecialties}
        profCounts={profCounts}
        onSelect={(id: string) => {
            setSelectedSpecialtyId(id);
            setSelectedProfessionalId('');
        }}
      />

      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-5xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
            <div>
                <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                    {step === 1 ? (appointmentToEdit ? 'Editar Agendamento' : 'Novo Agendamento') : 'Sucesso!'}
                </h3>
                {step === 1 && <p className="text-xs text-slate-400 hidden md:block">{appointmentToEdit ? 'Altere os dados da sessão.' : 'Configure os dados da sessão e gere o cronograma.'}</p>}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="text-slate-400 hover:text-red-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8 custom-scrollbar">
            {step === 1 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        {/* Paciente */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative">
                            <label className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-1"><User size={14}/> Paciente</label>
                            {!selectedPatient ? (
                                <div className="relative">
                                    <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                                    <input autoFocus className="w-full pl-12 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-bold uppercase placeholder:normal-case placeholder:font-normal" placeholder="Buscar paciente (Nome)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value.toUpperCase())} />
                                    {searchingPatient && <Loader2 className="absolute right-4 top-4 animate-spin text-blue-500 w-5 h-5"/>}
                                    {patientsFound.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-xl mt-2 border border-slate-100 overflow-hidden z-20 animate-fade-in-down">
                                            {patientsFound.map(p => (
                                                <button key={p.id} onClick={() => { setSelectedPatient(p); setSearchTerm(''); setPatientsFound([]); }} className="w-full text-left p-4 hover:bg-blue-50 border-b border-slate-50"><p className="font-bold text-slate-700 uppercase">{p.name}</p></button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <div><p className="font-bold text-blue-900 text-lg uppercase">{selectedPatient.name}</p><span className="text-xs font-bold bg-white text-blue-600 px-2 py-0.5 rounded border border-blue-200 mt-1 inline-block">Saldo: {patientBalance?.used}/{patientBalance?.total}</span></div>
                                    {!appointmentToEdit && <button onClick={() => setSelectedPatient(null)} className="p-2 hover:bg-blue-200 rounded-full text-blue-600"><X size={18}/></button>}
                                </div>
                            )}
                        </div>

                        {/* Especialidade (BUTTON QUE ABRE O MINI MODAL) */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative z-20">
                            <div>
                                <label className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-1"><Stethoscope size={14}/> Especialidade</label>
                                
                                {/* TRIGGER BUTTON */}
                                <button 
                                    type="button"
                                    onClick={() => setShowSpecSelector(true)} // Abre o Mini Modal
                                    className="w-full p-4 border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300 rounded-xl flex justify-between items-center transition-all group"
                                >
                                    <span className={`font-bold uppercase ${selectedSpecialtyObj ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {selectedSpecialtyObj ? selectedSpecialtyObj.name : "CLIQUE PARA SELECIONAR..."}
                                    </span>
                                    <ChevronDown size={20} className="text-slate-400 group-hover:text-blue-500"/>
                                </button>
                            </div>

                            {selectedSpecialtyId && (
                                <div className="animate-fade-in relative z-10">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">Profissional {loadingProfs && <Loader2 size={12} className="animate-spin text-blue-500"/>}</label>
                                    <div className="relative">
                                        <select className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 appearance-none uppercase disabled:opacity-50" value={selectedProfessionalId} onChange={e => setSelectedProfessionalId(e.target.value)} disabled={loadingProfs}>
                                            <option value="">QUALQUER DISPONÍVEL (POOL)</option>
                                            {professionalsList.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none w-5 h-5"/>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Direita: Cronograma (Mantido igual) */}
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
                            <label className="text-xs font-bold text-blue-600 uppercase mb-4 flex items-center gap-1"><Calendar size={14}/> Planejamento</label>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Início</label><input type="date" className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-700" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Horário</label><div className="relative"><select className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-700 appearance-none" value={startTime} onChange={e => setStartTime(e.target.value)}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select><Clock className="absolute right-3 top-3 text-slate-400 w-4 h-4 pointer-events-none"/></div></div>
                                </div>
                                {!appointmentToEdit && (
                                    <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-700">Repetir Agendamento?</span><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={isRecurrent} onChange={e => setIsRecurrent(e.target.checked)} /><div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div></label></div>
                                )}
                                {isRecurrent && !appointmentToEdit && (
                                    <div className="grid grid-cols-2 gap-3 animate-fade-in border-t border-slate-200 pt-3">
                                        <div><label className="text-[10px] font-bold text-slate-400 uppercase">Sessões</label><input type="number" min="2" max="20" className="w-full p-2 border rounded-lg" value={recurrenceCount} onChange={e => setRecurrenceCount(Number(e.target.value))} /></div>
                                        <div><label className="text-[10px] font-bold text-slate-400 uppercase">Frequência</label><select className="w-full p-2 border rounded-lg bg-white" value={recurrenceFreq} onChange={e => setRecurrenceFreq(e.target.value as any)}><option value="daily">Diário</option><option value="alternate">Dia sim/não</option><option value="weekly">Semanal</option></select></div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4">
                                <label className="text-xs font-bold text-amber-600 uppercase mb-2 flex items-center gap-1"><Bell size={14}/> Avisos para a Recepção</label>
                                <input className="w-full bg-white border border-amber-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-2 focus:ring-amber-300 outline-none" placeholder="Ex: Cobrar guia, Trazer exame..." value={receptionNotes} onChange={e => setReceptionNotes(e.target.value)} />
                            </div>

                            <div className="flex-1 flex flex-col min-h-[150px]">
                                <div className="flex justify-between items-end mb-2"><p className="text-xs font-bold text-slate-400 uppercase">Datas Geradas ({generatedSlots.length})</p>{!appointmentToEdit && <button onClick={handleGenerateSlots} className="text-[10px] font-bold text-blue-600 hover:underline">Resetar</button>}</div>
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 bg-white rounded-xl border border-slate-100 p-2">
                                    {generatedSlots.map((slot, index) => (
                                        <div key={slot.id} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg group">
                                            <span className="text-[10px] font-bold text-slate-400 w-5 text-center">{index + 1}</span>
                                            <input type="date" className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 w-32" value={slot.date} onChange={(e) => updateSlot(slot.id, 'date', e.target.value)} />
                                            <div className="relative w-24"><select className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 appearance-none pr-4" value={slot.time} onChange={(e) => updateSlot(slot.id, 'time', e.target.value)}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select><ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" /></div>
                                            {!appointmentToEdit && <button onClick={() => removeSlot(slot.id)} className="ml-auto p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full animate-scale-in p-4">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-50"><CheckCircle2 size={48} className="text-emerald-600" /></div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2 text-center">{appointmentToEdit ? 'Atualizado com Sucesso!' : 'Agendamento Confirmado!'}</h2>
                    <p className="text-slate-500 text-center max-w-md mb-8 text-lg"><strong>{generatedSlots.length} sessões</strong> foram {appointmentToEdit ? 'alteradas' : 'gravadas'} com sucesso.</p>
                    <div className="w-full max-w-sm space-y-4">
                        <button onClick={sendWhatsApp} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3"><MessageCircle size={24} /><span>Enviar no WhatsApp</span></button>
                        <button onClick={() => { onSuccess(); onClose(); }} className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">Fechar e Voltar</button>
                    </div>
                </div>
            )}
        </div>

        {step === 1 && (
            <div className="p-4 md:p-6 border-t border-slate-100 bg-white shrink-0 flex flex-col md:flex-row gap-3">
                <button onClick={onClose} className="w-full md:w-auto md:flex-1 py-4 md:py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 order-2 md:order-1">Cancelar</button>
                <button onClick={handleConfirm} disabled={saving || !selectedPatient || !selectedSpecialtyId || generatedSlots.length === 0} className="w-full md:w-auto md:flex-[2] py-4 md:py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 order-1 md:order-2">{saving ? <><Loader2 className="animate-spin" size={20}/> Salvando...</> : <><Save size={20} /> {appointmentToEdit ? 'Salvar Alterações' : `Confirmar (${generatedSlots.length})`}</>}</button>
            </div>
        )}
      </div>
    </div>
  );
};