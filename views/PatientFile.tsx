
/* src/views/PatientFile.tsx - VERSÃO INTEGRADA COM EVOLUTION 3.0 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Patient, Appointment, ClinicalEvolution, InsuranceProvider, PatientDocument } from '../types';
import { supabase } from '../services/supabase';
import * as patientService from '../services/patientService';
import { generatePatientSummary } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { AnamneseTab } from '../components/patient-file/AnamneseTab'; 
import { EvolutionTab } from '../components/patient-file/EvolutionTab'; // NEW IMPORT
import { 
    ArrowLeft, Activity, Save, 
    Upload, User, FileText, 
    Camera, Sparkles, 
    BrainCircuit, X, Stethoscope, 
    MessageCircle, Layers, 
    ChevronDown, ChevronUp,
    Calendar, Phone, Trash2, 
    AlertCircle, Clock, ClipboardList
} from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL ---
const SPECIALTY_COLORS: Record<string, string> = {
    'FISIOTERAPIA': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'PILATES': 'bg-violet-50 text-violet-700 border-violet-200',
    'OSTEOPATIA': 'bg-blue-50 text-blue-700 border-blue-200',
    'ACUPUNTURA': 'bg-rose-50 text-rose-700 border-rose-200',
    'RPG': 'bg-teal-50 text-teal-700 border-teal-200',
    'ANAMNESE': 'bg-amber-50 text-amber-700 border-amber-200',
    'DEFAULT': 'bg-slate-50 text-slate-700 border-slate-200'
};

// Added missing callbacks to fix assignability errors in App.tsx
interface Props { 
  patient: Patient; 
  appointment?: Appointment | null; 
  onBack: () => void;
  onEvolution?: () => void;
  onFinishVisit?: () => void;
}

// --- UTILITÁRIOS ---
function getPublicAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const { data } = supabase.storage.from("patient-avatars").getPublicUrl(path);
  return data.publicUrl;
}
function openWhatsApp(phone: string | null | undefined) {
    if (!phone) return;
    const cleanNumber = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanNumber}`, '_blank');
}
function calculateAge(birthDate?: string): number | null {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

const Toast = ({ message, type, onClose }: { message: string, type: 'success'|'error', onClose: () => void }) => (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border animate-fade-in-up ${type === 'success' ? 'bg-white border-emerald-100 text-emerald-800' : 'bg-white border-red-100 text-red-800'}`}>
        {type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
        <span className="font-bold text-sm">{message}</span>
        <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
);

import { CheckCircle2 } from 'lucide-react';

// Destructured missing props to satisfy TypeScript and allow component usage in App.tsx
const PatientFile: React.FC<Props> = ({ 
  patient: initialPatient, 
  appointment,
  onBack,
  onEvolution,
  onFinishVisit
}) => {
  const { session, userName } = useAuth();
  if (!initialPatient) return null;
  
  // DATA STATES
  const [patient, setPatient] = useState<Patient>(initialPatient);
  const [progress, setProgress] = useState<patientService.PatientProgress | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<patientService.TimelineEvent[]>([]);
  
  // LEGACY STATES
  const [evolutions, setEvolutions] = useState<ClinicalEvolution[]>([]);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [careEpisodes, setCareEpisodes] = useState<any[]>([]); 
  
  // UI STATES
  const [activeTab, setActiveTab] = useState<'overview'|'anamnese'|'evolution'|'docs'|'registration'>('overview');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success'|'error' } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image'|'pdf'|null>(null);
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);

  // Edit States
  const [attendanceType, setAttendanceType] = useState(patient.attendance_type || 'Particular');
  const [selectedInsurance, setSelectedInsurance] = useState(patient.insurance_id || '');
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null); 
  
  // IA States (Sidebar)
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiModeTitle, setAiModeTitle] = useState('');
  const [isAiExpanded, setIsAiExpanded] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  // INITIAL LOAD
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            const p = await patientService.getPatientById(patient.id);
            if (p) {
                setPatient(p);
                setAttendanceType(p.attendance_type || 'Particular');
                setSelectedInsurance(p.insurance_id || '');
                if (p.clinic_id) {
                    const [episodes] = await Promise.all([
                        patientService.getCareEpisodes(p.id)
                    ]);
                    setCareEpisodes(episodes || []);
                    listDocuments(p.clinic_id, p.id);
                }
            }
            const prog = await patientService.getPatientProgress(patient.id);
            setProgress(prog);
            refreshTimeline();
            
            // Legacy load for Sidebar AI
            const evols = await patientService.listEvolutions(patient.id);
            setEvolutions(evols);

        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    };
    if (patient.id !== 'new') loadData();
  }, [patient.id]);

  const refreshTimeline = async () => {
      const timeline = await patientService.getPatientUnifiedTimeline(patient.id);
      setTimelineEvents(timeline);
  };

  const handleSavePatient = async () => { 
      try { await patientService.updatePatient(patient.id, { attendance_type: attendanceType, insurance_id: selectedInsurance === '' ? null : selectedInsurance, phone: patient.phone, document: patient.document, risk_level: patient.risk_level, birth_date: patient.birth_date, email: patient.email }); showToast("Dados salvos!"); } catch { showToast("Erro ao salvar.", "error"); } 
  };

  const handleSidebarAI = async (mode: 'report'|'assistant') => {
      setGeneratingAi(true); setAiModeTitle(mode === 'report' ? "Relatório Histórico" : "Assistente Clínico");
      try {
          const history = evolutions.slice(0,10).map(e => ({...e, description: e.assessment, date: new Date(e.evolved_at).toLocaleDateString(), professional: e.professional_name || ''}));
          const res = await generatePatientSummary(patient, history as any);
          setAiSummary(res); setIsAiExpanded(true);
      } catch { showToast("Erro IA", "error"); } finally { setGeneratingAi(false); }
  };

  // Docs
  const listDocuments = async (clinicId: string, patientId: string) => {
      try {
          const { data } = await supabase.storage.from('patient-files').list(`${clinicId}/${patientId}/docs`);
          setDocuments((data || []).map(f => ({ display_name: f.name, id: f.id, file_type: f.metadata?.mimetype?.startsWith('image/') ? 'image' : 'pdf', storage_path: `${clinicId}/${patientId}/docs/${f.name}`, created_at: f.created_at })));
      } catch { }
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, source: 'camera'|'file') => {
      if (!e.target.files?.length) return; setUploading(true);
      try {
          const file = e.target.files[0]; await supabase.storage.from('patient-files').upload(`${patient.clinic_id}/${patient.id}/docs/${Date.now()}_${file.name}`, file);
          await listDocuments(patient.clinic_id, patient.id); showToast("Enviado!");
      } catch { showToast("Erro upload", "error"); } finally { setUploading(false); }
  };

  // UI COMPUTED
  const displayAvatar = useMemo(() => getPublicAvatarUrl(patient.profile_photo_path) || patient.avatar_url, [patient]);
  const patientAge = useMemo(() => calculateAge(patient.birth_date), [patient.birth_date]);
  
  const progressPercent = useMemo(() => {
      if (!progress || progress.total_sessions === 0) return 0;
      return Math.min((progress.sessions_used / progress.total_sessions) * 100, 100);
  }, [progress]);

  return (
    <div className="space-y-6 pb-24 md:pb-8 relative animate-fade-in">
       {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
       {previewUrl && <div className="fixed inset-0 z-[70] bg-black/90 flex justify-center items-center p-4" onClick={() => setPreviewUrl(null)}><div onClick={e => e.stopPropagation()}>{previewType==='image'?<img src={previewUrl} className="max-h-[85vh] rounded"/>:<button onClick={()=>window.open(previewUrl!, '_blank')} className="bg-white px-6 py-3 rounded font-bold">Abrir PDF</button>}</div></div>}
       {isAiExpanded && <div className="fixed inset-0 z-[60] bg-black/50 flex justify-center items-center p-4"><div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col"><div className="bg-purple-700 p-4 text-white flex justify-between"><h3>{aiModeTitle}</h3><button onClick={()=>setIsAiExpanded(false)}><X/></button></div><div className="p-6 overflow-y-auto flex-1 whitespace-pre-wrap">{aiSummary}</div></div></div>}

       <div className="flex items-center gap-4">
           <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
           <div className="flex-1"><h2 className="text-2xl font-bold text-slate-800">Prontuário Eletrônico</h2><p className="text-sm text-slate-500">ID: #{patient.id.slice(0,8).toUpperCase()}</p></div>
           {loading && <span className="text-xs text-blue-600 animate-pulse">Sincronizando...</span>}
       </div>

       {careEpisodes.length > 0 && (
           <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button onClick={() => setActiveEpisodeId(null)} className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${activeEpisodeId === null ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>Geral</button>
                {careEpisodes.map(ep => (<button key={ep.id} onClick={() => setActiveEpisodeId(ep.id)} className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-2 ${activeEpisodeId === ep.id ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'}`}><Layers size={12}/>{ep.title}</button>))}
           </div>
       )}

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-1 space-y-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center relative overflow-hidden">
                   <div className="w-28 h-28 rounded-full mx-auto mb-4 bg-slate-100 flex items-center justify-center border-4 border-slate-50 overflow-hidden shadow-inner mt-4 relative">
                       {displayAvatar ? <img src={displayAvatar} className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-slate-300" />}
                   </div>
                   <h3 className="text-xl font-bold text-slate-800">{patient.name}</h3>
                   <div className="flex justify-center items-center gap-2 mt-1 mb-4 text-sm text-slate-500 font-medium">
                        <span>{patientAge ? `${patientAge} Anos` : 'Idade N/D'}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="uppercase">{attendanceType}</span>
                   </div>
                   <div className="flex justify-center gap-2 mb-6">
                       <button onClick={() => openWhatsApp(patient.phone)} className="p-2 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors border border-emerald-100"><MessageCircle size={18} /></button>
                       <span className={`px-3 py-2 rounded-full text-xs font-bold flex items-center ${patient.risk_level === 'high' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                           {patient.risk_level === 'high' ? 'Alto Risco' : 'Baixo Risco'}
                       </span>
                   </div>
                   <div className="mb-2 px-4 text-left">
                       <div className="flex justify-between text-xs mb-1 font-bold text-slate-600 uppercase tracking-wide">
                           <span>{progress?.cycle_title || 'Ciclo Atual'}</span>
                           <span>{progress ? `${progress.sessions_used}/${progress.total_sessions}` : '0/0'}</span>
                       </div>
                       <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                           <div className={`h-full rounded-full transition-all duration-1000 ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progressPercent}%` }}></div>
                       </div>
                   </div>
               </div>
               <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group">
                   <div className="relative z-10">
                       <h3 className="font-bold text-lg flex items-center gap-2 mb-3"><Sparkles className="w-5 h-5 text-yellow-300 animate-pulse"/> Aura AI</h3>
                       <div className="space-y-2">
                           <button onClick={() => handleSidebarAI('report')} disabled={generatingAi} className="w-full py-2.5 bg-white text-indigo-700 font-bold rounded-lg text-xs shadow-md flex items-center justify-center gap-2 hover:bg-indigo-50 transition-transform active:scale-95"><FileText size={14}/> Relatório Histórico</button>
                           <button onClick={() => handleSidebarAI('assistant')} disabled={generatingAi} className="w-full py-2.5 bg-indigo-500/30 border border-indigo-400 text-white font-bold rounded-lg text-xs hover:bg-indigo-500/50 flex items-center justify-center gap-2 transition-transform active:scale-95"><Stethoscope size={14}/> Assistente Clínico</button>
                       </div>
                   </div>
                   <BrainCircuit className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
               </div>
           </div>

           <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
               <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-hide">
                   {['overview', 'anamnese', 'evolution', 'docs', 'registration'].map(tab => (
                       <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-4 px-4 text-sm font-bold whitespace-nowrap capitalize transition-colors border-b-2 ${activeTab === tab ? 'text-blue-600 border-blue-600 bg-blue-50/30' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'}`}>{tab === 'docs' ? 'Documentos' : tab === 'registration' ? 'Cadastro' : tab === 'overview' ? 'Visão Geral' : tab === 'evolution' ? 'Evolução' : tab}</button>
                   ))}
               </div>
               
               <div className="p-6 flex-1 bg-slate-50/50 overflow-y-auto">
                   
                   {activeTab === 'overview' && (
                       <div className="space-y-6 animate-fade-in">
                           <div className="flex items-center justify-between mb-2">
                               <h4 className="font-bold text-slate-800 flex items-center text-lg"><Activity className="w-5 h-5 mr-2 text-blue-600"/> Timeline Clínica</h4>
                           </div>
                           
                           {timelineEvents.length === 0 ? (
                               <div className="text-center py-10 opacity-50">
                                   <ClipboardList className="w-12 h-12 mx-auto text-slate-300 mb-2"/>
                                   <p className="text-sm font-bold text-slate-400">Nenhum registro encontrado.</p>
                               </div>
                           ) : (
                               <div className="space-y-4 relative">
                                   <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200"></div>
                                   {timelineEvents.map((ev, index) => {
                                       const isAnamnesis = ev.timeline_type === 'anamnesis';
                                       const styleClass = SPECIALTY_COLORS[isAnamnesis ? 'ANAMNESE' : ev.title] || SPECIALTY_COLORS['DEFAULT'];
                                       const isExpanded = expandedTimelineId === ev.event_id;

                                       return (
                                           <div key={`${ev.event_id}_${index}`} className="relative pl-10 group">
                                               <div className={`absolute left-[11px] top-5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${isAnamnesis ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                               <div 
                                                    onClick={() => setExpandedTimelineId(isExpanded ? null : ev.event_id)}
                                                    className={`bg-white rounded-xl border shadow-sm transition-all cursor-pointer overflow-hidden hover:shadow-md ${styleClass} ${isExpanded ? 'ring-1 ring-blue-100' : ''}`}
                                               >
                                                   <div className="p-4">
                                                       <div className="flex justify-between items-start mb-2">
                                                           <div className="flex items-center gap-2">
                                                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${isAnamnesis ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{ev.title}</span>
                                                               <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Clock size={10}/> {new Date(ev.timeline_at).toLocaleDateString()}</span>
                                                           </div>
                                                           <div className="flex items-center gap-2">{isExpanded ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}</div>
                                                       </div>
                                                       <div className="text-sm text-slate-700 font-medium line-clamp-2">{ev.summary || 'Sem descrição.'}</div>
                                                       <div className="mt-3 flex items-center justify-between border-t border-slate-100/50 pt-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{ev.professional_name.split(' ')[0]}</span>
                                                            {ev.pain_level > 0 && (<span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-md border border-red-100">DOR: {ev.pain_level}</span>)}
                                                       </div>
                                                   </div>
                                                   {isExpanded && (
                                                       <div className="bg-slate-50 p-4 border-t border-slate-100 animate-fade-in-down">
                                                           {ev.details && (<div className="mb-3"><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Análise / Plano / Diagnóstico</span><p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{ev.details}</p></div>)}
                                                           <div className="flex justify-end"><button onClick={(e) => { e.stopPropagation(); setActiveTab(isAnamnesis ? 'anamnese' : 'evolution'); }} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">Ver Registro Completo <ArrowLeft size={12} className="rotate-180"/></button></div>
                                                       </div>
                                                   )}
                                               </div>
                                           </div>
                                       );
                                   })}
                               </div>
                           )}
                       </div>
                   )}

                   {activeTab === 'anamnese' && <AnamneseTab patientId={patient.id} />}
                   
                   {/* 4. EVOLUÇÃO (NOVA IMPLEMENTAÇÃO) */}
                   {activeTab === 'evolution' && (
                       <EvolutionTab 
                            patientId={patient.id} 
                            patientName={patient.name}
                            onUpdate={refreshTimeline} // Atualiza a timeline geral quando salvar uma evolução
                       />
                   )}

                   {activeTab === 'docs' && (
                       <div className="space-y-6">
                           <div className="grid grid-cols-2 gap-4">
                               <button onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center justify-center p-4 bg-blue-600 text-white rounded-xl shadow-lg"><Camera className="w-5 h-5 mb-2"/><span className="text-xs font-bold">Câmera</span><input type="file" ref={cameraInputRef} className="hidden" onChange={e => handleFileUpload(e, 'camera')} /></button>
                               <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed text-slate-600 rounded-xl"><Upload className="w-5 h-5 mb-2"/><span className="text-xs font-bold">Upload</span><input type="file" ref={fileInputRef} className="hidden" onChange={e => handleFileUpload(e, 'file')} /></button>
                           </div>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {documents.map(doc => (<div key={doc.id} className="relative group bg-white p-3 rounded-2xl border shadow-sm cursor-pointer" onClick={() => setPreviewUrl(supabase.storage.from('patient-files').getPublicUrl(doc.storage_path).data.publicUrl)}><div className="aspect-square bg-slate-50 flex items-center justify-center mb-2"><FileText className="text-slate-400"/></div><p className="text-xs truncate">{doc.display_name}</p><button onClick={(e) => { e.stopPropagation(); supabase.storage.from('patient-files').remove([doc.storage_path]); setDocuments(p => p.filter(d => d.id !== doc.id)); }} className="absolute top-1 right-1 p-1 bg-white rounded-full text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button></div>))}
                           </div>
                       </div>
                   )}
                   {activeTab === 'registration' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div><h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500"/> Informações Pessoais</h4><div className="space-y-4"><div><label className="block text-xs font-bold text-slate-500 mb-1">Nome</label><input value={patient.name} disabled className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-600 font-medium cursor-not-allowed"/></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 mb-1">CPF</label><input value={patient.document || ''} onChange={e => setPatient({...patient, document: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 outline-none"/></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Nasc.</label><input type="date" value={patient.birth_date || ''} onChange={e => setPatient({...patient, birth_date: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 outline-none"/></div></div></div></div>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div><h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-500"/> Contato</h4><div className="space-y-4"><div><label className="block text-xs font-bold text-slate-500 mb-1">Telefone</label><input value={patient.phone || ''} onChange={e => setPatient({...patient, phone: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 outline-none"/></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Email</label><input value={patient.email || ''} onChange={e => setPatient({...patient, email: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 outline-none"/></div></div></div>
                            </div>
                            <div className="flex justify-end pt-4 border-t border-slate-100"><button onClick={handleSavePatient} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"><Save className="w-5 h-5"/> Salvar Dados</button></div>
                        </div>
                   )}
               </div>
           </div>
       </div>
    </div>
  );
};

export default PatientFile;