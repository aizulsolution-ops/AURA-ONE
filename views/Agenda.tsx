/* src/views/Agenda.tsx - VERSÃO 30.0 (FIX: LAYOUT HEADER + SMART TIME FOCUS + ERRO ALERT) */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabase'; 
import * as agendaService from '../services/agendaService';
import { listPatients } from '../services/patientService';
import { useAuth } from '../contexts/AuthContext';
import { Patient } from '../types';

// --- COMPONENTES EXTERNOS ---
import { AgendaMacroView } from '../components/agenda/AgendaMacroView'; 
import { AppointmentFormModal } from '../components/agenda/AppointmentFormModal'; 
import { DayClosingModal } from '../components/agenda/DayClosingModal'; 
import { AllSpecialtiesModal } from '../components/agenda/AllSpecialtiesModal'; 

// --- ÍCONES ---
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Plus, User, Bell, CheckCircle2, X, Trash2, Clock, 
  Lock, AlertTriangle, CalendarDays, Filter, Search,
  Menu, ChevronFirst, Edit3, ArrowRightCircle, History, LayoutGrid,
  MessageCircle, PlayCircle, UserCheck, CreditCard, Sparkles, StickyNote, Save,
  Star, AlertCircle 
} from 'lucide-react';

// ============================================================================
// 1. TIPAGEM & CONSTANTES
// ============================================================================

interface AgendaItem {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_avatar?: string;
  patient_age?: number | null; 
  patient_phone?: string;      
  insurance_name?: string;     
  patient_risk?: string;
  
  specialty_name: string;
  specialty_id: string;
  professional_name?: string;
  assigned_to_profile_id?: string;
  
  status: string; 
  starts_at: string; 
  updated_at: string;
  has_arrived: boolean;
  session_info?: string;
  reception_alert?: string;
}

interface SpecialtyConfig {
    id: string;          
    specialty_id: string; 
    name: string;
    capacidade: number;
    short_name?: string; 
    custom_name?: string; 
    color?: string;      
    is_favorite?: boolean; 
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'border-l-slate-300 bg-white hover:border-l-blue-400',
  confirmed: 'border-l-blue-500 bg-blue-50/20 hover:bg-blue-50',
  checked_in: 'border-l-emerald-500 bg-emerald-50 border-2 border-emerald-100 shadow-md z-10',
  in_progress: 'border-l-purple-500 bg-purple-50/30',
  finished: 'border-l-slate-400 bg-slate-100 opacity-60',
  canceled: 'border-l-red-200 bg-red-50 opacity-50 grayscale',
  cancelled: 'border-l-red-200 bg-red-50 opacity-50 grayscale',
  cancelado: 'border-l-red-200 bg-red-50 opacity-50 grayscale',
  done: 'border-l-slate-400 bg-slate-100 opacity-60', 
  no_show: 'border-l-red-300 bg-red-50 opacity-60 grayscale', 
};

// ============================================================================
// 2. HELPERS
// ============================================================================

const formatDateForRPC = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const calculateAge = (birthDate?: string | null): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

const getPublicAvatarUrl = (path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = supabase.storage.from("patient-avatars").getPublicUrl(path);
  return data.publicUrl;
};

const openWhatsApp = (phone?: string) => {
    if (!phone) return;
    const cleanNumber = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanNumber}`, '_blank');
};

// ============================================================================
// 3. SUB-COMPONENTES INTERNOS (Auxiliares)
// ============================================================================

const PatientSearchModal = ({ isOpen, onClose, patients, onSelectPatient }: any) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    const filteredPatients = useMemo(() => {
        if (!searchTerm) return [];
        return patients.filter((p: Patient) => p.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10);
    }, [searchTerm, patients]);

    const fetchHistory = async (patientId: string) => {
        setLoadingHistory(true);
        try {
            const { data } = await supabase.from('agenda_events').select('*').eq('patient_id', patientId).order('start_at', { ascending: false }).limit(5);
            setHistory(data || []);
        } catch (e) { console.error(e); }
        setLoadingHistory(false);
    };

    const handleSelect = (p: Patient) => {
        setSelectedPatient(p);
        fetchHistory(p.id);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-3xl h-[650px] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                    <Search className="text-slate-400" />
                    <input autoFocus className="flex-1 bg-transparent outline-none text-lg font-bold text-slate-700 placeholder:text-slate-300" placeholder="Buscar paciente por nome, CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <button onClick={onClose}><X className="text-slate-400 hover:text-red-500 transition-colors" /></button>
                </div>
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-1/3 border-r border-slate-100 overflow-y-auto bg-slate-50/50">
                        {filteredPatients.map((p: Patient) => (
                            <button key={p.id} onClick={() => handleSelect(p)} className={`w-full text-left p-4 border-b border-slate-100 hover:bg-white transition-all group ${selectedPatient?.id === p.id ? 'bg-white border-l-4 border-l-blue-600 shadow-sm' : ''}`}>
                                <p className="font-bold text-sm text-slate-700 truncate group-hover:text-blue-600">{p.name}</p>
                                <p className="text-xs text-slate-400 truncate">{p.phone || 'Sem telefone'}</p>
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 bg-white">
                        {selectedPatient ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl border-4 border-slate-50 shadow-sm overflow-hidden">
                                        {selectedPatient.profile_photo_path ? <img src={getPublicAvatarUrl(selectedPatient.profile_photo_path) || ''} className="w-full h-full object-cover"/> : selectedPatient.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-800">{selectedPatient.name}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 inline-block ${selectedPatient.risk_level === 'Alto' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>Risco: {selectedPatient.risk_level || 'Baixo'}</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><History size={14}/> Histórico</h4>
                                    <div className="space-y-3">
                                        {history.map(h => (
                                            <div key={h.id} className="p-3 border border-slate-100 rounded-xl flex justify-between items-center"><p className="font-bold text-sm text-slate-700">{new Date(h.start_at).toLocaleDateString()} <span className="text-slate-400 font-normal">às</span> {new Date(h.start_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-100 text-slate-500`}>{h.status}</span></div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-4 mt-auto"><button onClick={() => onSelectPatient(selectedPatient)} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95"><ArrowRightCircle size={20} /> ABRIR PRONTUÁRIO</button></div>
                            </div>
                        ) : <div className="h-full flex flex-col items-center justify-center text-slate-300"><User size={64} className="mb-4 opacity-20"/><p className="font-medium">Selecione um paciente</p></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, loading }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} /></div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Cancelar Agendamento?</h3>
                <p className="text-sm text-slate-500 mb-6">Essa ação não pode ser desfeita e o horário ficará livre novamente.</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50">Não, voltar</button>
                    <button onClick={onConfirm} disabled={loading} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 flex items-center gap-2">{loading ? 'Cancelando...' : 'Sim, Cancelar'}</button>
                </div>
            </div>
        </div>
    );
};

const ReceptionAlertModal = ({ event, onClose, onSave }: any) => {
    const [note, setNote] = useState(event?.reception_alert || '');
    const [saving, setSaving] = useState(false);
    const handleSave = async () => { setSaving(true); await onSave(event.id, note); setSaving(false); onClose(); };
    if (!event) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-amber-50 rounded-2xl w-full max-w-sm shadow-xl border-2 border-amber-100 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-amber-100 flex justify-between items-center bg-amber-100/50"><h3 className="font-bold text-amber-800 flex items-center gap-2"><Bell size={18} className="fill-amber-600 text-amber-600"/> Alerta de Recepção</h3><button onClick={onClose}><X size={18} className="text-amber-700"/></button></div>
                <div className="p-4"><p className="text-xs font-bold text-amber-600 uppercase mb-2">Mensagem:</p><textarea className="w-full h-32 bg-white border border-amber-200 rounded-xl p-3 text-sm text-slate-700 outline-none resize-none" value={note} onChange={e => setNote(e.target.value)} autoFocus /></div>
                <div className="p-3 bg-white border-t border-amber-100 flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold rounded-lg text-xs">Cancelar</button><button onClick={handleSave} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center gap-2">{saving ? 'Salvando...' : <><Save size={14}/> Salvar</>}</button></div>
            </div>
        </div>
    );
};

const SmartRow = ({ data, onStatusChange, onClick, onAlertClick }: any) => {
    const isArrived = ['checked_in', 'checkin'].includes(data.status);
    const isDone = ['done', 'finished', 'cancelled', 'canceled', 'cancelado', 'no_show'].includes(data.status);
    const timeDisplay = new Date(data.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const styleClass = STATUS_STYLES[data.status] || 'border-l-slate-300 bg-white';

    return (
        <div onClick={() => onClick(data)} className={`group relative w-full rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden border-l-[4px] shadow-sm hover:shadow-md mb-2 flex flex-row items-stretch min-h-[88px] ${styleClass} ${isArrived ? 'z-10 ring-1 ring-emerald-200 bg-emerald-50/30' : ''}`}>
            <div className="flex flex-col items-center justify-center px-2 py-2 border-r border-slate-100 bg-slate-50/50 w-[75px] shrink-0">
                <span className={`text-sm font-black ${isArrived ? 'text-emerald-700' : 'text-slate-700'}`}>{timeDisplay}</span>
                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{isArrived ? 'Na Sala' : 'Agend.'}</span>
            </div>
            <div className="flex-1 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-hidden">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="relative shrink-0"><div className={`w-12 h-12 rounded-full border-2 ${isArrived ? 'border-emerald-500' : 'border-slate-200'} bg-white flex items-center justify-center overflow-hidden shadow-sm`}>{data.patient_avatar ? <img src={data.patient_avatar} className="w-full h-full object-cover" /> : <User size={22} className="text-slate-300" />}</div></div>
                    <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                        <div className="flex items-center gap-2">
                            <h4 className={`font-bold text-sm md:text-base leading-tight truncate ${isArrived ? 'text-emerald-900' : 'text-slate-800'}`}>{data.patient_name}</h4>
                            <button onClick={(e) => { e.stopPropagation(); onAlertClick(data); }} className={`p-1 rounded-full transition-all ${data.reception_alert ? 'bg-amber-100 text-amber-600 animate-pulse hover:bg-amber-200 hover:scale-110' : 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'}`} title={data.reception_alert || "Adicionar alerta"}><Bell size={14} className={data.reception_alert ? 'fill-amber-600' : ''} /></button>
                            <span className={`hidden md:inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${data.insurance_name === 'Particular' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>{data.insurance_name || 'Particular'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500"><span className="font-bold text-slate-700 truncate flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> {data.specialty_name}</span>{data.professional_name && <span className="truncate flex items-center gap-1 text-slate-400"><UserCheck size={10}/> {data.professional_name}</span>}{data.patient_risk === 'Alto' && <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md flex items-center gap-1 ml-auto md:ml-0"><AlertTriangle size={8}/> Risco</span>}</div>
                    </div>
                </div>
            </div>
            {!isDone && (<div className="flex flex-col border-l border-slate-100 w-[80px] md:w-auto md:px-3 md:py-2 md:border-none md:justify-center bg-slate-50/30">{!isArrived ? (<button onClick={(e) => { e.stopPropagation(); onStatusChange(data.id, 'checked_in'); }} className="h-full md:h-10 md:w-auto w-full bg-blue-600 hover:bg-blue-700 text-white flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 md:px-5 md:rounded-lg transition-all active:scale-95 shadow-sm shadow-blue-200 group-hover:shadow-md"><PlayCircle size={20} className="md:w-4 md:h-4 fill-white/20" /><span className="text-[10px] md:text-xs font-bold uppercase text-center md:text-left leading-tight"><span className="hidden md:inline">Aguardando</span><span className="md:hidden">Aguard.</span></span></button>) : (<div className="h-full md:h-auto flex flex-col items-center justify-center text-emerald-600 px-2 md:px-4 bg-emerald-50/50 md:bg-emerald-50 md:rounded-lg md:border md:border-emerald-100"><Clock size={20} className="animate-pulse mb-1 md:mb-0 md:mr-1 inline-block" /><span className="text-[9px] md:text-xs font-bold uppercase text-center leading-none"><span className="hidden md:inline">Na Sala</span><span className="md:hidden">Chegou</span></span></div>)}</div>)}
        </div>
    );
};

const AppointmentDetailsModal = ({ event, onClose, onStartVisit, onEdit, onRequestCancel }: any) => {
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => {
        if (!event?.patient_id) return;
        const fetchAiReport = async () => {
            setLoadingAI(true);
            try {
                const { data } = await supabase.from('ai_reports').select('content, content_text').eq('patient_id', event.patient_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
                if (data) setAiSummary(data.content?.summary || data.content?.analysis || data.content_text?.substring(0, 200) + '...');
                else setAiSummary(null);
            } catch (e) { } finally { setLoadingAI(false); }
        };
        fetchAiReport();
    }, [event]);

    if (!event) return null;

    return (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in relative" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white text-center relative"><button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-md"><X size={20} /></button><div className="relative inline-block mb-3"><div className="w-24 h-24 rounded-full border-4 border-white/30 mx-auto overflow-hidden shadow-xl bg-white flex items-center justify-center">{event.patient_avatar ? <img src={event.patient_avatar} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-300"/>}</div></div><h3 className="text-xl font-black tracking-tight mb-1">{event.patient_name}</h3><div className="flex justify-center gap-2 text-blue-100 text-xs font-medium opacity-90"><span className="flex items-center gap-1"><CreditCard size={12}/> {event.insurance_name || 'Particular'}</span><span>•</span><span>{event.patient_age ? `${event.patient_age} anos` : 'Idade N/D'}</span></div></div>
                {event.reception_alert && <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-start gap-3"><Bell className="text-amber-500 shrink-0 mt-0.5 animate-pulse" size={18} /><div><p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Nota da Recepção</p><p className="text-sm text-amber-800 font-medium leading-tight">{event.reception_alert}</p></div></div>}
                <div className="px-6 pt-6 pb-2"><div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-4 relative overflow-hidden group"><div className="absolute top-0 right-0 w-16 h-16 bg-indigo-100 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div><div className="relative z-10"><div className="flex items-center gap-2 mb-2"><Sparkles size={16} className="text-indigo-600 fill-indigo-200" /><span className="text-xs font-bold text-indigo-700 uppercase">Flash Report (IA)</span></div>{loadingAI ? <div className="flex items-center gap-2 text-indigo-400 text-xs"><span className="animate-spin">⌛</span> Analisando histórico...</div> : aiSummary ? <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">"{aiSummary}"</p> : <p className="text-xs text-indigo-300 italic">Nenhum relatório anterior disponível para análise.</p>}</div></div></div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4"><div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center"><span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Horário</span><span className="text-xl font-black text-slate-800">{new Date(event.starts_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span></div><div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center"><span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Especialidade</span><span className="text-xs font-bold text-slate-800 truncate block mt-1">{event.specialty_name}</span></div></div>
                    <div className="flex justify-center gap-6 py-2"><button onClick={() => openWhatsApp(event.patient_phone)} className="flex flex-col items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors group"><div className="p-3 bg-slate-100 rounded-2xl group-hover:bg-emerald-50 transition-all"><MessageCircle size={20} /></div><span className="text-[9px] font-bold uppercase">WhatsApp</span></button><button onClick={() => onEdit(event)} className="flex flex-col items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors group"><div className="p-3 bg-slate-100 rounded-2xl group-hover:bg-blue-50 transition-all"><Edit3 size={20} /></div><span className="text-[9px] font-bold uppercase">Editar</span></button><button onClick={() => onRequestCancel(event.id)} className="flex flex-col items-center gap-2 text-slate-500 hover:text-red-600 transition-colors group"><div className="p-3 bg-slate-100 rounded-2xl group-hover:bg-red-50 transition-all"><Trash2 size={20} /></div><span className="text-[9px] font-bold uppercase">Cancelar</span></button></div>
                    <button onClick={() => onStartVisit(event)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm tracking-wide shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-95 uppercase"><PlayCircle size={24} className="fill-white/20" /> Iniciar Atendimento</button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 4. COMPONENTE PRINCIPAL (AGENDA) - INTEGRADO
// ============================================================================

const Agenda: React.FC<any> = ({ onNavigate }) => {
    const { clinicId } = useAuth();
    
    // --- ESTADOS ---
    const [events, setEvents] = useState<AgendaItem[]>([]);
    const [specialtiesConfig, setSpecialtiesConfig] = useState<SpecialtyConfig[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]); 
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeSlot, setActiveSlot] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<string | null>(null); 
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'info'} | null>(null);
    const [clinicRules, setClinicRules] = useState<any>(null);

    // --- MODAIS ---
    const [showNewModal, setShowNewModal] = useState(false);
    const [showAllSpecsModal, setShowAllSpecsModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showClosingModal, setShowClosingModal] = useState(false); 
    const [newModalParams, setNewModalParams] = useState({ date: '', time: '' });
    
    // --- ESTADOS DE SELEÇÃO E AÇÃO ---
    const [selectedEvent, setSelectedEvent] = useState<AgendaItem | null>(null);
    const [appointmentToEdit, setAppointmentToEdit] = useState<AgendaItem | null>(null); 
    const [alertModalEvent, setAlertModalEvent] = useState<AgendaItem | null>(null); // FIX: ESTADO ADICIONADO
    
    // --- ESTADOS DE VISUALIZAÇÃO ---
    const [macroViewMode, setMacroViewMode] = useState<'month' | 'week' | null>(null);

    // --- ESTADOS DE EXCLUSÃO ---
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [eventIdToDelete, setEventIdToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // --- LOAD ---
    useEffect(() => {
        if (!clinicId) return;
        const loadClinicData = async () => {
            try {
                const { data: rulesData } = await supabase.from('clinics').select('settings').eq('id', clinicId).single();
                if (rulesData?.settings) setClinicRules(rulesData.settings);

                const { data: specData } = await supabase
                    .from('clinic_specialties')
                    .select(`id, specialty_id, capacidade, custom_name, is_favorite, specialties ( name, short_name, color )`)
                    .eq('clinic_id', clinicId);
                
                if (specData) {
                    const formatted = specData.map((item: any) => ({
                        id: item.id, specialty_id: item.specialty_id, name: item.specialties?.name || 'Geral',
                        capacidade: item.capacidade, short_name: item.specialties?.short_name, custom_name: item.custom_name, color: item.specialties?.color, is_favorite: item.is_favorite
                    })).filter((s: any) => s.capacidade > 0).sort((a: any, b: any) => a.name.localeCompare(b.name));
                    setSpecialtiesConfig(formatted);
                }
                const pts = await listPatients();
                setPatients(pts);
            } catch (err) { console.error(err); }
        };
        loadClinicData();
    }, [clinicId]);

    // --- SLOTS + TIME AWARE SCROLL ---
    const timeSlots = useMemo(() => {
        if (!clinicRules) return ['07:00','08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00'];
        const slots = [];
        const [openH, openM] = (clinicRules.opens_at || '07:00').split(':').map(Number);
        const [closeH, closeM] = (clinicRules.closes_at || '19:00').split(':').map(Number);
        const [lunchStartH, lunchStartM] = (clinicRules.lunch_start || '12:00').split(':').map(Number);
        const [lunchEndH, lunchEndM] = (clinicRules.lunch_end || '14:00').split(':').map(Number);
        const duration = clinicRules.slot_duration || 40;

        let current = new Date(); current.setHours(openH, openM, 0, 0); 
        const end = new Date(); end.setHours(closeH, closeM, 0, 0);
        while (current < end) {
            const currentTotal = current.getHours() * 60 + current.getMinutes();
            if (currentTotal < lunchStartH * 60 + lunchStartM || currentTotal >= lunchEndH * 60 + lunchEndM) {
                slots.push(current.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
            }
            current.setMinutes(current.getMinutes() + duration);
        }
        return slots;
    }, [clinicRules]);

    // --- AUTO-SCROLL INTELIGENTE ---
    useEffect(() => {
        if (timeSlots.length > 0) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            let closestSlot = timeSlots[0];
            let maxMinutes = -1;

            timeSlots.forEach(slot => {
                const [h, m] = slot.split(':').map(Number);
                const slotMinutes = h * 60 + m;
                // Encontra o último slot que já começou (Floor)
                if (slotMinutes <= currentMinutes && slotMinutes > maxMinutes) {
                    maxMinutes = slotMinutes;
                    closestSlot = slot;
                }
            });

            if (!activeSlot) {
                setActiveSlot(closestSlot);
            }

            // Scroll automático
            setTimeout(() => {
                const element = document.getElementById(`slot-${closestSlot}`);
                if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }, [timeSlots]);

    // --- FETCH ---
    const fetchAgenda = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        const dateStr = formatDateForRPC(selectedDate);
        try {
            const { data: rawEvents, error } = await supabase
                .from('agenda_events')
                .select('*')
                .eq('clinic_id', clinicId)
                .gte('start_at', `${dateStr}T00:00:00`)
                .lte('start_at', `${dateStr}T23:59:59`)
                .order('start_at', { ascending: true });
            
            if (error) throw error;
            if (!rawEvents || rawEvents.length === 0) { setEvents([]); setLoading(false); return; }

            const patientIds = [...new Set(rawEvents.map((e: any) => e.patient_id).filter(Boolean))];
            const specialtyIds = [...new Set(rawEvents.map((e: any) => e.specialty_id).filter(Boolean))];
            const profileIds = [...new Set(rawEvents.map((e: any) => e.assigned_to_profile_id).filter(Boolean))];

            let patientsData: Record<string, any> = {};
            let specialtiesMap: Record<string, string> = {};
            let profilesMap: Record<string, string> = {};
            let insuranceMap: Record<string, string> = {};

            if (patientIds.length > 0) {
                const { data: pts } = await supabase.from('patients').select('id, name, birth_date, profile_photo_path, phone, insurance_id, risk_level').in('id', patientIds);
                const insIds = pts?.map(p => p.insurance_id).filter(Boolean) || [];
                if (insIds.length > 0) {
                    const { data: ins } = await supabase.from('insurance_providers').select('id, name').in('id', insIds);
                    ins?.forEach((i:any) => { insuranceMap[i.id] = i.name; });
                }
                pts?.forEach((p: any) => { 
                    patientsData[p.id] = { 
                        name: p.name, 
                        age: calculateAge(p.birth_date), 
                        avatar: getPublicAvatarUrl(p.profile_photo_path), 
                        phone: p.phone, 
                        insurance: insuranceMap[p.insurance_id] || 'Particular', 
                        risk: p.risk_level === 'high' || p.risk_level === 'Alto' ? 'Alto' : 'Baixo' 
                    }; 
                });
            }

            if (specialtyIds.length > 0) {
                const { data: catSpecs } = await supabase.from('specialties').select('id, name').in('id', specialtyIds);
                catSpecs?.forEach((s: any) => { specialtiesMap[s.id] = s.name; });
            }

            if (profileIds.length > 0) {
                const { data: profs } = await supabase.from('profiles').select('id, name').in('id', profileIds);
                profs?.forEach((p:any) => { profilesMap[p.id] = p.name.split(' ')[0]; });
            }

            const formattedEvents: AgendaItem[] = rawEvents.map((item: any) => {
                const pData = patientsData[item.patient_id] || {};
                return {
                    id: item.id,
                    patient_id: item.patient_id,
                    patient_name: pData.name || 'Paciente',
                    patient_avatar: pData.avatar,
                    patient_age: pData.age,
                    patient_phone: pData.phone,
                    insurance_name: pData.insurance,
                    patient_risk: pData.risk,
                    specialty_name: specialtiesMap[item.specialty_id] || 'Geral',
                    specialty_id: item.specialty_id,
                    assigned_to_profile_id: item.assigned_to_profile_id,
                    professional_name: profilesMap[item.assigned_to_profile_id],
                    status: item.status, 
                    starts_at: item.start_at,
                    updated_at: item.updated_at || item.created_at,
                    has_arrived: ['checked_in', 'checkin'].includes(item.status),
                    session_info: item.title,
                    reception_alert: item.reception_alert
                };
            });

            setEvents(formattedEvents);
        } catch (err: any) { console.error(err); } finally { setLoading(false); }
    }, [clinicId, selectedDate]);

    useEffect(() => { fetchAgenda(); }, [fetchAgenda]);

    // --- ACTIONS ---
    const handleStatusChange = async (eventId: string, newStatus: string) => {
        try {
            setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus, has_arrived: true, updated_at: new Date().toISOString() } : e));
            const { error } = await supabase.from('agenda_events').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', eventId);
            if (error) throw error;
            setToast({ msg: 'Status atualizado!', type: 'success' });
            setTimeout(() => setToast(null), 2000);
        } catch (err) { fetchAgenda(); } 
    };

    const handleAlertSave = async (eventId: string, note: string) => {
        try {
            const { error } = await supabase.from('agenda_events').update({ reception_alert: note }).eq('id', eventId);
            if (error) throw error;
            setEvents(prev => prev.map(e => e.id === eventId ? { ...e, reception_alert: note } : e));
            setToast({ msg: 'Alerta salvo!', type: 'success' });
        } catch(e) { alert("Erro ao salvar alerta."); }
    };

    const handleEdit = (event: AgendaItem) => {
        setAppointmentToEdit(event);
        setSelectedEvent(null);
        setShowNewModal(true);
    };

    const requestDelete = (eventId: string) => {
        setEventIdToDelete(eventId);
        setSelectedEvent(null);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!eventIdToDelete) return;
        setDeleting(true);
        try {
            const { error } = await supabase.from('agenda_events').update({ status: 'canceled' }).eq('id', eventIdToDelete);
            if (error) { 
                const { error: err2 } = await supabase.from('agenda_events').update({ status: 'cancelado' }).eq('id', eventIdToDelete);
                if (err2) throw err2;
            }
            setEvents(currentEvents => currentEvents.map(ev => 
                ev.id === eventIdToDelete ? { ...ev, status: 'canceled' } : ev
            ));
            setToast({ msg: 'Agendamento cancelado com sucesso!', type: 'info' });
        } catch (e: any) { 
            console.error(e);
            alert(`Erro ao cancelar: ${e.message}`); 
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
            setEventIdToDelete(null);
        }
    };

    const handleStartVisit = (event: AgendaItem) => {
        const p = patients.find(pt => pt.id === event.patient_id);
        if (p) onNavigate('PATIENT_FILE', p);
        else onNavigate('PATIENT_FILE', { id: event.patient_id, name: event.patient_name });
    };

    const eventsByHour = useMemo(() => {
        const groups: Record<string, AgendaItem[]> = {};
        events.forEach(ev => {
            if (activeFilter) { 
                const config = specialtiesConfig.find(s => s.id === activeFilter); 
                if (config && ev.specialty_id !== config.specialty_id) return; 
            }
            const hour = new Date(ev.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            if (!groups[hour]) groups[hour] = [];
            groups[hour].push(ev);
        });

        Object.keys(groups).forEach(hour => {
            groups[hour].sort((a, b) => {
                const aArrived = ['checked_in', 'checkin'].includes(a.status);
                const bArrived = ['checked_in', 'checkin'].includes(b.status);
                if (aArrived && !bArrived) return -1;
                if (!aArrived && bArrived) return 1;
                if (aArrived && bArrived) return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
                return 0;
            });
        });
        return groups;
    }, [events, activeFilter, specialtiesConfig]);

    const dateDisplay = selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' });
    const headerSpecialties = useMemo(() => specialtiesConfig.filter(s => s.is_favorite).slice(0, 5), [specialtiesConfig]);

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden relative">
            <button 
                onClick={() => { 
                    setAppointmentToEdit(null);
                    setNewModalParams({ date: formatDateForRPC(selectedDate), time: activeSlot || '' }); 
                    setShowNewModal(true); 
                }}
                className="fixed bottom-8 right-8 z-[60] bg-blue-600 hover:bg-blue-700 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group shadow-blue-200"
            >
                <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300"/>
            </button>

            {/* HEADER REORGANIZADO */}
            <div className="flex-none bg-white border-b border-slate-200 px-4 py-3 z-20 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-blue-600 transition-all">
                            {isSidebarOpen ? <ChevronFirst size={24}/> : <Menu size={24}/>}
                        </button>
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200/50">
                            <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} className="p-1.5 hover:bg-white rounded-lg text-slate-500 transition-all"><ChevronLeft size={18}/></button>
                            <div className="px-3 text-center min-w-[130px]">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{selectedDate.getFullYear()}</span>
                                <span className="block text-sm font-black text-slate-800 capitalize leading-none">{dateDisplay}</span>
                            </div>
                            <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} className="p-1.5 hover:bg-white rounded-lg text-slate-500 transition-all"><ChevronRight size={18}/></button>
                        </div>
                        <div className="hidden md:flex bg-slate-100 rounded-lg p-1 gap-1">
                            <button onClick={() => setMacroViewMode('week')} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-white hover:shadow-sm rounded-md transition-all uppercase">Semana</button>
                            <button onClick={() => setMacroViewMode('month')} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-white hover:shadow-sm rounded-md transition-all uppercase">Mês</button>
                        </div>
                    </div>

                    {/* BARRA DE ESPECIALIDADES REORGANIZADA */}
                    <div className="hidden md:flex flex-1 items-center overflow-x-auto scrollbar-hide px-2 border-l border-slate-200 ml-2">
                        {/* Botão Grid AGORA AQUI */}
                        <button 
                            onClick={() => setShowAllSpecsModal(true)} 
                            className="h-9 w-9 flex-none flex items-center justify-center rounded-lg bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-all mr-3" 
                            title="Ver todas especialidades"
                        >
                            <LayoutGrid size={18}/>
                        </button>

                        <div className="h-6 w-px bg-slate-200 mx-2 flex-none"></div>

                        <button 
                            onClick={() => setActiveFilter(null)}
                            className={`h-9 px-4 rounded-lg text-[10px] font-bold uppercase transition-all border flex items-center justify-center gap-2 shadow-sm flex-none ${activeFilter === null ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                            <UserCheck size={14} /> TODOS
                        </button>

                        {headerSpecialties.map(spec => (
                            <button 
                                key={spec.id} 
                                onClick={() => setActiveFilter(activeFilter === spec.id ? null : spec.id)} 
                                className={`h-9 px-3 rounded-lg border transition-all shadow-sm flex items-center gap-2 min-w-[80px] flex-none whitespace-nowrap ${activeFilter === spec.id ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                            >
                                {spec.is_favorite && activeFilter !== spec.id && <Star size={10} className="text-amber-400 fill-amber-400" />}
                                <span className="text-[10px] font-bold uppercase truncate max-w-[100px]">{spec.custom_name || spec.short_name || spec.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* FERRAMENTAS DIREITA */}
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                        <button onClick={() => setShowSearchModal(true)} className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all" title="Buscar Paciente"><Search size={18}/></button>
                        <button onClick={() => setShowClosingModal(true)} className="h-9 px-3 rounded-lg border border-red-100 bg-red-50 text-red-600 flex items-center gap-2 text-[10px] font-bold uppercase hover:bg-red-100 transition-all ml-2"><Lock size={14} /> Fechar Dia</button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className={`bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar transition-all duration-300 flex-none ${isSidebarOpen ? 'w-24 md:w-32' : 'w-0 opacity-0'}`}>
                    <div className="flex flex-col">
                        {timeSlots.map(time => {
                            const count = eventsByHour[time]?.length || 0;
                            const isActive = activeSlot === time;
                            return (
                                <button 
                                    key={time}
                                    id={`slot-${time}`} // ID para scroll
                                    onClick={() => setActiveSlot(time)}
                                    className={`h-14 w-full flex items-center justify-between px-4 border-b border-slate-100 transition-all group ${isActive ? 'bg-blue-50 text-blue-700 border-l-4 border-l-blue-600 border-b-blue-100' : 'hover:bg-slate-50 text-slate-500 border-l-4 border-l-transparent'}`}
                                >
                                    <span className={`text-sm ${isActive ? 'font-black' : 'font-bold'}`}>{time}</span>
                                    {count > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>{count}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 bg-slate-50/50 p-3 md:p-4 overflow-y-auto pb-24">
                    <div className="max-w-5xl mx-auto">
                        {loading ? (
                            <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div></div>
                        ) : activeSlot ? (
                            <div className="animate-fade-in">
                                <div className="flex items-center gap-2 mb-4">
                                    <h2 className="text-xl font-bold text-slate-700 tracking-tight">{activeSlot}</h2>
                                    {activeFilter && <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold animate-scale-in"><Filter size={12}/>{specialtiesConfig.find(s => s.id === activeFilter)?.custom_name}<button onClick={() => setActiveFilter(null)} className="hover:bg-blue-200 rounded-full p-0.5"><X size={12}/></button></div>}
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                </div>

                                {eventsByHour[activeSlot]?.length > 0 ? (
                                    <div className="space-y-3">
                                        {eventsByHour[activeSlot].map(ev => (
                                            <SmartRow 
                                                key={ev.id} 
                                                data={ev} 
                                                onStatusChange={handleStatusChange}
                                                onClick={(item: any) => setSelectedEvent(item)}
                                                onAlertClick={(item: any) => { setAlertModalEvent(item); setShowAlertModal(true); }}
                                            />
                                        ))}
                                        <button onClick={() => { setAppointmentToEdit(null); setNewModalParams({ date: formatDateForRPC(selectedDate), time: activeSlot || '' }); setShowNewModal(true); }} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-all hover:bg-white"><Plus size={18} className="mr-2"/> Encaixar Paciente</button>
                                    </div>
                                ) : (
                                    <div onClick={() => { setAppointmentToEdit(null); setNewModalParams({ date: formatDateForRPC(selectedDate), time: activeSlot }); setShowNewModal(true); }} className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30 cursor-pointer hover:border-blue-300 transition-all group flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Plus className="w-8 h-8 text-blue-500"/></div>
                                        <p className="text-slate-500 font-bold text-sm">Horário Livre</p>
                                        <p className="text-slate-400 text-xs mt-1">Toque para agendar um paciente</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 font-medium animate-pulse opacity-50"><CalendarDays size={64} className="mb-4"/><p>Selecione um horário à esquerda</p></div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAIS */}
            <AppointmentDetailsModal 
                event={selectedEvent} 
                onClose={() => setSelectedEvent(null)} 
                onStartVisit={handleStartVisit}
                onEdit={handleEdit} 
                onRequestCancel={requestDelete} 
            />

            <ReceptionAlertModal 
                event={alertModalEvent}
                onClose={() => { setShowAlertModal(false); setAlertModalEvent(null); }}
                onSave={handleAlertSave}
            />

            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                loading={deleting}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
            />

            {/* Modal de Especialidades (Dupla Ação) */}
            <AllSpecialtiesModal 
                isOpen={showAllSpecsModal} 
                onClose={() => setShowAllSpecsModal(false)} 
                specialties={specialtiesConfig}
                events={events}
                activeSlot={activeSlot} 
                onSelect={setActiveFilter}
                onScheduleRequest={(specId: string) => {
                    setNewModalParams({ date: formatDateForRPC(selectedDate), time: activeSlot || '' });
                    setShowNewModal(true);
                }}
            />
            
            <PatientSearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} patients={patients} onSelectPatient={(p: any) => { onNavigate('PATIENT_FILE', p); setShowSearchModal(false); }} />

            {macroViewMode && <AgendaMacroView isOpen={!!macroViewMode} initialMode={macroViewMode} timeSlots={timeSlots} onClose={() => setMacroViewMode(null)} onSelectDate={(date) => { setSelectedDate(date); setMacroViewMode(null); }} />}

            {showNewModal && (
                <AppointmentFormModal 
                    isOpen={showNewModal}
                    onClose={() => setShowNewModal(false)}
                    onSuccess={() => { setShowNewModal(false); fetchAgenda(); setToast({ msg: appointmentToEdit ? 'Agendamento Atualizado!' : 'Agendamento Realizado!', type: 'success' }); }}
                    clinicId={clinicId}
                    specialties={specialtiesConfig}
                    timeSlots={timeSlots}
                    initialDate={newModalParams.date}
                    initialTime={newModalParams.time}
                    appointmentToEdit={appointmentToEdit}
                />
            )}

            <DayClosingModal isOpen={showClosingModal} onClose={() => setShowClosingModal(false)} clinicId={clinicId} currentDate={selectedDate} onSuccess={() => { fetchAgenda(); setToast({ msg: 'Dia fechado com sucesso!', type: 'success' }); }} />

            {toast && <div className="fixed bottom-24 right-8 z-[90] bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up border border-slate-700"><CheckCircle2 size={18} className="text-emerald-400"/><p className="font-bold text-sm tracking-wide">{toast.msg}</p></div>}
        </div>
    );
};

export default Agenda;