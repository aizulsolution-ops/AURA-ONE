/* src/components/patient-file/EvolutionTab.tsx - VERSÃO CORRIGIDA (FISIOTERAPIA / AZUL) */
import React, { useState, useEffect } from 'react';
import { 
  Plus, X, CheckCircle2, 
  ArrowRight, Loader2,
  Thermometer, Zap, Dumbbell, PlayCircle,
  Activity, Sparkles, BrainCircuit
} from 'lucide-react';
import { ClinicalEvolution, EvolutionRecord } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import * as patientService from '../../services/patientService';
import { generatePatientSummary } from '../../services/geminiService';

// --- CONFIGURAÇÃO DE EQUIPAMENTOS (CLÍNICA/FISIO) ---
const EQUIPAMENTOS = [
  { category: 'Eletro', icon: Zap, items: [
    { name: 'TENS DIGITAL' }, { name: 'TENS CONVENCIONAL' },
    { name: 'FES FUNCIONAL' }, { name: 'FES CONVENCIONAL' },
    { name: 'ONDAS CURTAS' }, { name: 'INFRAVERMELHO' },
    { name: 'LASER POTÊNCIA' }, { name: 'ONDAS CHOQUE' }
  ]},
  { category: 'Crio', icon: Thermometer, items: [{ name: 'CRIOTERAPIA' }]},
  { category: 'Cinesio', icon: Dumbbell, items: [
    { name: 'HALTER' }, { name: 'CANELEIRA' },
    { name: 'THERABAND' }, { name: 'MINIBAND' },
    { name: 'CIRCULE' }, { name: 'KETTLEBELL' }
  ]}
];

// Cores Azuis/Clínicas
const SPECIALTY_COLORS: Record<string, string> = {
    'FISIOTERAPIA': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'PILATES': 'bg-violet-50 text-violet-700 border-violet-200',
    'OSTEOPATIA': 'bg-blue-50 text-blue-700 border-blue-200',
    'ACUPUNTURA': 'bg-rose-50 text-rose-700 border-rose-200',
    'RPG': 'bg-teal-50 text-teal-700 border-teal-200',
    'DEFAULT': 'bg-slate-50 text-slate-700 border-slate-200'
};

interface Props {
  patientId: string;
  patientName: string;
  onUpdate?: () => void;
}

export const EvolutionTab: React.FC<Props> = ({ patientId, patientName, onUpdate }) => {
  const { session, userName, clinicId } = useAuth();
  
  // STATES
  const [evolutions, setEvolutions] = useState<ClinicalEvolution[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // FORMULÁRIO
  const [formData, setFormData] = useState<{
    id?: string;
    title: string;
    pain_level: number;
    pain_status: 'MELHOR' | 'IGUAL' | 'PIOR';
    subjective: string;
    procedures_tags: string[];
    objective: string; 
    assessment: string; 
    plan: string; 
  }>({
    title: 'FISIOTERAPIA', // Padrão correto
    pain_level: 0,
    pain_status: 'IGUAL',
    subjective: '',
    procedures_tags: [],
    objective: '',
    assessment: '',
    plan: ''
  });

  // IA STATES
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiMessage, setAiMessage] = useState('Analisando histórico...');

  // LOAD
  useEffect(() => { fetchEvolutions(); }, [patientId]);

  const fetchEvolutions = async () => {
    setLoading(true);
    const data = await patientService.listEvolutions(patientId);
    setEvolutions(data);
    setLoading(false);
  };

  const handleOpenNew = () => {
    setFormData({
        title: 'FISIOTERAPIA', pain_level: 0, pain_status: 'IGUAL',
        subjective: '', procedures_tags: [], objective: '', assessment: '', plan: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (ev: ClinicalEvolution) => {
    setFormData({
        id: ev.id,
        title: ev.title || 'FISIOTERAPIA',
        pain_level: ev.pain_level || 0,
        pain_status: (ev.evolution_data?.pain_status as any) || 'IGUAL',
        subjective: ev.subjective || '',
        procedures_tags: ev.procedures_tags || [],
        objective: ev.objective || '',
        assessment: ev.assessment || '',
        plan: ev.plan || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.assessment && !formData.subjective) return alert("Preencha o Subjetivo ou gere a Análise.");
    setIsSaving(true);
    try {
        let episodeId = evolutions[0]?.episode_id;
        if (!episodeId) {
            const eps = await patientService.getCareEpisodes(patientId);
            episodeId = eps.length > 0 ? eps[0].id : (await patientService.createCareEpisode({ patient_id: patientId, clinic_id: clinicId, title: 'Geral' }))?.id;
        }

        const payload = {
            patient_id: patientId, clinic_id: clinicId, episode_id: episodeId,
            professional_id: session?.user?.id, professional_name: userName,
            title: formData.title, pain_level: formData.pain_level,
            subjective: formData.id ? formData.subjective : `[STATUS: ${formData.pain_status}] ${formData.subjective}`,
            objective: formData.objective, assessment: formData.assessment, plan: formData.plan,
            procedures_tags: formData.procedures_tags, was_attended: true
        };

        await patientService.createEvolution(payload);
        await fetchEvolutions();
        if (onUpdate) onUpdate();
        setIsModalOpen(false);
    } catch (error) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  // --- IA GERAÇÃO TÁTICA (FLASHCARD) ---
  const handleGenerateAI = async () => {
    setGeneratingAi(true);
    const messages = ["Lendo últimos relatos...", "Identificando padrões...", "Sintetizando flashcard..."];
    let i = 0;
    const interval = setInterval(() => { setAiMessage(messages[i % messages.length]); i++; }, 1500);

    try {
        const history = evolutions.slice(0, 3).map(e => `[${new Date(e.evolved_at).toLocaleDateString()}] DOR:${e.pain_level}/10. RELATO: ${e.subjective}. CD: ${e.assessment}`);
        
        const currentSessionData = `SESSÃO ATUAL (${formData.title}): Dor ${formData.pain_level}/10 (${formData.pain_status}). Queixa: ${formData.subjective}. Procedimentos: ${formData.procedures_tags.join(', ')}`;

        const contextRecord: EvolutionRecord = {
            id: 'ctx', date: 'HOJE', professional: 'AURA',
            description: `HISTÓRICO:\n${history.join('\n')}\n\nDADOS DE HOJE:\n${currentSessionData}`
        };

        // Chama o modo 'session_insight' que configuramos no geminiService
        const result = await generatePatientSummary({ id: patientId, name: patientName } as any, [contextRecord], 'session_insight');
        
        setFormData(prev => ({ ...prev, assessment: result, plan: '' })); 

    } catch (e) { alert("Erro na IA."); } finally { clearInterval(interval); setGeneratingAi(false); }
  };

  const toggleProcedure = (proc: string) => {
    setFormData(prev => {
        const exists = prev.procedures_tags.includes(proc);
        return { ...prev, procedures_tags: exists ? prev.procedures_tags.filter(p => p !== proc) : [...prev.procedures_tags, proc] };
    });
  };

  return (
    <div className="h-full flex flex-col">
        {!isModalOpen && (
            <div className="space-y-6 animate-fade-in">
                <button onClick={handleOpenNew} className="w-full py-4 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl font-bold hover:bg-blue-50 flex items-center justify-center gap-2 transition-all active:scale-95"><Plus className="w-5 h-5"/> Nova Sessão</button>
                <div className="space-y-4">
                    {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500"/></div> : evolutions.length === 0 ? <div className="text-center text-slate-400 py-10">Nenhuma evolução registrada.</div> : evolutions.map(ev => (
                        <div key={ev.id} onClick={() => handleEdit(ev)} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-blue-300 transition-all cursor-pointer group">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${SPECIALTY_COLORS[ev.title || 'DEFAULT']}`}>{ev.title || 'GERAL'}</span><span className="font-bold text-slate-800 text-sm">{new Date(ev.evolved_at).toLocaleDateString()}</span></div>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-500">{ev.professional_name}</span><ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors"/></div>
                            </div>
                            {ev.pain_level > 0 && (<div className="mb-2"><span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100">DOR: {ev.pain_level}</span></div>)}
                            <p className="text-xs text-slate-600 line-clamp-2">{ev.subjective.replace(/\[STATUS:.*?\] /, '')}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
                    <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center z-10 shrink-0">
                        <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Activity className="text-blue-600"/> Sessão de Atendimento</h2><p className="text-xs text-slate-400">Preencha os 3 blocos para finalizar.</p></div>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors"><X size={24}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-6">
                        {/* BLOCO 1: Check-in */}
                        <section className="bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 rounded-2xl border border-blue-100/50 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 uppercase tracking-wide"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span> Check-in do Paciente</h3>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div><label className="text-xs font-bold text-slate-500 mb-3 block uppercase">Nível de Dor (EVA)</label><div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm"><input type="range" min="0" max="10" step="1" value={formData.pain_level} onChange={(e) => setFormData(prev => ({...prev, pain_level: Number(e.target.value)}))} className="w-full h-2 bg-gradient-to-r from-green-300 via-yellow-300 to-red-400 rounded-lg appearance-none cursor-pointer mb-4"/><div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">Sem Dor</span><span className={`text-2xl font-black ${formData.pain_level > 7 ? 'text-red-500' : formData.pain_level > 3 ? 'text-amber-500' : 'text-green-500'}`}>{formData.pain_level}</span><span className="text-xs font-bold text-slate-400">Insuportável</span></div></div></div>
                                <div><label className="text-xs font-bold text-slate-500 mb-3 block uppercase">Status vs Anterior</label><div className="grid grid-cols-3 gap-3">{[{ id: 'MELHOR', icon: '😊', active: 'bg-green-100 border-green-500 text-green-800' }, { id: 'IGUAL', icon: '😐', active: 'bg-slate-100 border-slate-500 text-slate-800' }, { id: 'PIOR', icon: '😫', active: 'bg-red-100 border-red-500 text-red-800' }].map((status) => (<button key={status.id} onClick={() => setFormData(prev => ({...prev, pain_status: status.id as any}))} className={`py-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${formData.pain_status === status.id ? status.active : 'bg-white border-slate-100 text-slate-400'}`}><span className="text-2xl">{status.icon}</span><span className="text-[10px] font-bold uppercase">{status.id}</span></button>))}</div></div>
                            </div>
                            <div className="mt-4"><label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Relato Subjetivo</label><input className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-300" placeholder="O que o paciente relatou hoje?" value={formData.subjective} onChange={e => setFormData(prev => ({...prev, subjective: e.target.value}))}/></div>
                        </section>

                        {/* BLOCO 2: Área Técnica */}
                        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400"></div>
                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 uppercase tracking-wide"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</span> Área Técnica</h3>
                            <div className="mb-4"><label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Procedimentos Realizados</label><div className="flex flex-wrap gap-2 mb-3 min-h-[40px] p-2 bg-slate-50 rounded-lg border border-slate-100">{formData.procedures_tags.length === 0 && <span className="text-xs text-slate-400 italic p-1">Nenhum selecionado.</span>}{formData.procedures_tags.map(tag => (<span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-sm animate-scale-in">{tag} <button onClick={() => toggleProcedure(tag)} className="hover:text-red-200"><X size={12}/></button></span>))}</div><div className="h-px bg-slate-100 my-3"></div><div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scrollbar">{EQUIPAMENTOS.flatMap(cat => cat.items.map(item => (<button key={item.name} onClick={() => toggleProcedure(item.name)} className={`text-left px-3 py-2 rounded-lg text-[10px] font-bold border transition-all truncate ${formData.procedures_tags.includes(item.name) ? 'bg-indigo-50 text-indigo-700 border-indigo-200 opacity-50' : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-300 hover:text-indigo-600'}`}>{item.name}</button>)))}</div></div>
                        </section>

                        {/* BLOCO 3: Aura AI (Flashcard) */}
                        <section className="bg-gradient-to-br from-indigo-900 to-purple-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden min-h-[250px] flex flex-col justify-center">
                            <BrainCircuit className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 rotate-12"/>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-pink-400"></div>

                            {!generatingAi && !formData.assessment ? (
                                <div className="text-center relative z-10">
                                    <Sparkles className="w-12 h-12 text-yellow-300 mx-auto mb-4 animate-pulse"/>
                                    <h3 className="text-xl font-bold mb-2">Aura AI (Flashcard)</h3>
                                    <p className="text-indigo-200 text-sm mb-6 max-w-md mx-auto">Gerar resumo tático para a sessão de agora.</p>
                                    <button onClick={handleGenerateAI} className="px-8 py-4 bg-white text-indigo-900 rounded-full font-black text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-3 mx-auto"><PlayCircle size={20}/> GERAR FLASHCARD</button>
                                </div>
                            ) : generatingAi ? (
                                <div className="text-center relative z-10 flex flex-col items-center">
                                    <div className="w-16 h-16 mb-6 relative"><div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping"></div><div className="absolute inset-0 rounded-full border-4 border-t-purple-400 border-r-pink-400 border-b-transparent border-l-transparent animate-spin"></div><BrainCircuit className="absolute inset-0 m-auto text-white w-8 h-8"/></div>
                                    <h3 className="text-lg font-bold animate-pulse">{aiMessage}</h3>
                                </div>
                            ) : (
                                <div className="relative z-10 w-full animate-fade-in">
                                    <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold text-indigo-200 uppercase flex items-center gap-2"><Sparkles size={14} className="text-yellow-300"/> Flashcard Gerado</h3><button onClick={handleGenerateAI} className="text-xs text-white/50 hover:text-white underline">Regerar</button></div>
                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-inner">
                                        <textarea value={formData.assessment} onChange={e => setFormData(prev => ({...prev, assessment: e.target.value}))} className="w-full bg-transparent text-sm text-white border-none outline-none resize-none h-48 placeholder:text-white/20 font-mono leading-relaxed" spellCheck={false}/>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>

                    <div className="bg-white border-t border-slate-200 p-4 flex justify-end gap-3 shrink-0 z-20">
                        <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                        <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70">{isSaving ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle2 size={20}/>} FINALIZAR SESSÃO</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};