import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  FileText, 
  X, 
  Save, 
  Paperclip, 
  Activity, 
  ChevronRight, 
  Loader2, 
  AlertTriangle, 
  FileEdit, 
  CheckCircle2, 
  Trash2,
  Calendar,
  User
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PatientAnamnese } from '../../types';

interface Props {
  patientId: string;
}

export const AnamneseTab: React.FC<Props> = ({ patientId }) => {
  const { clinicId, userName } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Modos de visualização: Lista, Criação (Modal) ou Leitura (Modal)
  const [mode, setMode] = useState<'list' | 'create' | 'read'>('list');
  
  const [anamneses, setAnamneses] = useState<any[]>([]);
  const [selectedAnamnese, setSelectedAnamnese] = useState<any>(null);
  
  // Controle de Edição e Segurança
  const [isDirty, setIsDirty] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState<Partial<PatientAnamnese>>({});
  const [painQualities, setPainQualities] = useState<string[]>([]);

  // Carrega dados ao montar
  useEffect(() => {
    if (patientId) {
        fetchAnamneses();
    }
  }, [patientId]);

  // Trava de segurança "beforeunload" (Navegador)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const fetchAnamneses = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
        .from('patient_anamnesis')
        .select('*')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
        
        if (error) throw error;
        setAnamneses(data || []);
    } catch (error) {
        console.error("Erro ao buscar anamneses:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleNew = () => {
    resetForm();
    setMode('create');
  };

  const resetForm = () => {
    setFormData({
      title: 'FISIOTERAPIA', // Valor padrão
      clinical_diagnosis: '',
      main_complaint: '',
      history_life: '',
      lifestyle_status: 'SEDENTARIO',
      lifestyle_details: '',
      pain_level: 0,
      indication_alert: '',
      exams_physical: '',
      exams_complementary: '',
      medications: '',
      surgical_history: '',
      therapeutic_plan: '',
      pain_location: '',
      id: undefined // Limpa ID para garantir que é um novo registro
    });
    setPainQualities([]);
    setIsDirty(false);
  };

  // Abre Anamnese: Se for Draft -> Edita. Se for Final -> Lê.
  const handleOpenItem = (item: any) => {
    if (item.status === 'draft') {
      // Carrega dados para edição (Modo Rascunho)
      setFormData(item);
      // Recupera array de qualidades da dor
      setPainQualities(item.pain_quality ? item.pain_quality.split(', ') : []);
      setMode('create');
      setIsDirty(false); // Inicialmente limpo ao carregar, suja apenas se editar
    } else {
      // Modo Leitura (Finalizado)
      setSelectedAnamnese(item);
      setMode('read');
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (!confirm("Existem alterações não salvas. Deseja realmente descartar e sair?")) return;
    }
    setMode('list');
    setIsDirty(false);
  };

  const handleSave = async (status: 'draft' | 'final') => {
    if (!formData.title) return alert("Por favor, selecione a especialidade/título da ficha.");
    
    setSaving(true);
    
    try {
      const payload = {
        clinic_id: clinicId,
        patient_id: patientId,
        ...formData,
        pain_quality: painQualities.join(', '), 
        status: status, // Define se é rascunho ou final
        created_by: (await supabase.auth.getUser()).data.user?.id,
        created_by_name: userName, // Grava nome do autor para histórico
        updated_at: new Date().toISOString()
      };

      // Lógica de UPSERT (Insert ou Update)
      if (formData.id) {
         // Se já tem ID, é atualização de um rascunho existente
         const { error } = await supabase
            .from('patient_anamnesis')
            .update(payload)
            .eq('id', formData.id);
         if (error) throw error;
      } else {
         // Se não tem ID, é criação nova
         const { error } = await supabase
            .from('patient_anamnesis')
            .insert(payload);
         if (error) throw error;
      }

      await fetchAnamneses(); // Recarrega a lista
      setIsDirty(false);
      setMode('list'); // Volta para a lista
    } catch (err) {
      alert("Erro ao salvar ficha: " + err);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Helper Inputs Genérico
  const handleInput = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value.toUpperCase() }));
    setIsDirty(true);
  };

  // Toggle de Multi-seleção de Dor
  const togglePainQuality = (quality: string) => {
    setPainQualities(prev => 
      prev.includes(quality) ? prev.filter(q => q !== quality) : [...prev, quality]
    );
    setIsDirty(true);
  };

  // --- AUTO-BULLET (NOVA FUNÇÃO SOLICITADA) ---
  const handleAutoBullet = (e: React.KeyboardEvent<HTMLTextAreaElement>, fieldName: string) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const input = e.currentTarget;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const value = input.value;
        
        // Insere quebra de linha + bullet point
        const newValue = value.substring(0, start) + "\n• " + value.substring(end);
        
        // Atualiza o estado
        setFormData(prev => ({...prev, [fieldName]: newValue}));
        
        // Hack para reposicionar o cursor logo após o bullet criado
        setTimeout(() => {
            input.selectionStart = input.selectionEnd = start + 3;
        }, 0);
    }
  };

  // --- RENDERIZAÇÃO ---

  if (loading && mode === 'list') {
      return (
        <div className="p-20 flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-blue-600 w-8 h-8"/>
        </div>
      );
  }

  return (
    <div className="min-h-[500px] h-full relative">
      
      {/* 1. MODO LISTA (HUB DE AVALIAÇÕES) */}
      {mode === 'list' && (
        <div className="space-y-6 animate-fade-in pb-10">
          <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                <FileText className="text-blue-600"/> Histórico de Avaliações
                </h3>
                <p className="text-xs text-slate-400 mt-1">Gerencie as fichas de avaliação inicial por especialidade.</p>
            </div>
            <button onClick={handleNew} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 hover:scale-105 transition-all flex items-center gap-2">
              <Plus size={20}/> Nova Anamnese
            </button>
          </div>

          {anamneses.length === 0 ? (
            <div className="p-16 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <FileText size={32} />
              </div>
              <p className="text-slate-500 font-medium mb-1">Nenhuma avaliação registrada.</p>
              <p className="text-xs text-slate-400">Clique em "Nova Anamnese" para começar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {anamneses.map(item => {
                const isDraft = item.status === 'draft';
                return (
                  <div key={item.id} onClick={() => handleOpenItem(item)} className={`p-6 rounded-2xl border shadow-sm hover:shadow-lg cursor-pointer transition-all group relative bg-white ${isDraft ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-200 hover:border-blue-300'}`}>
                    
                    {/* Badge de Rascunho */}
                    {isDraft && (
                        <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl flex items-center gap-1 border-b border-l border-amber-200">
                            <FileEdit size={12}/> RASCUNHO
                        </div>
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${isDraft ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                        {item.title || 'GERAL'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mr-20">
                        <Calendar size={12}/> {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-slate-800 mb-2 truncate text-base">
                        {item.clinical_diagnosis || 'Diagnóstico não informado'}
                    </h4>
                    
                    <p className="text-xs text-slate-500 mb-5 line-clamp-2 h-8 leading-relaxed">
                        {item.main_complaint || 'Sem queixa principal registrada...'}
                    </p>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 uppercase">
                          {item.created_by_name?.[0] || 'P'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Responsável</span>
                            <span className="text-xs text-slate-600 font-medium">{item.created_by_name || 'Profissional'}</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-white"/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. MODO LEITURA (MODAL PADRONIZADO - READ ONLY) */}
      {mode === 'read' && selectedAnamnese && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                    <FileText className="text-blue-600"/> {selectedAnamnese.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    Ficha finalizada em {new Date(selectedAnamnese.created_at).toLocaleDateString()} por <strong className="uppercase">{selectedAnamnese.created_by_name}</strong>
                </p>
              </div>
              <button onClick={() => setMode('list')} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200">
                <X className="text-slate-400"/>
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto bg-white">
               {selectedAnamnese.indication_alert && (
                 <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 font-bold text-sm flex items-start gap-3 shadow-sm">
                   <Activity className="shrink-0 mt-0.5"/> 
                   <div>
                       <span className="block text-xs uppercase opacity-70 mb-1">Alertas / Contraindicações</span>
                       {selectedAnamnese.indication_alert}
                   </div>
                 </div>
               )}

               <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Activity size={12}/> Diagnóstico Clínico</label>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 font-medium leading-relaxed">
                        {selectedAnamnese.clinical_diagnosis || '-'}
                      </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><FileText size={12}/> Queixa Principal</label>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 font-medium leading-relaxed">
                        {selectedAnamnese.main_complaint || '-'}
                      </div>
                  </div>
               </div>

               <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                   <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Avaliação da Dor</h4>
                   <div className="grid md:grid-cols-3 gap-6">
                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
                          <span className="block text-xs font-bold text-slate-400 mb-2">NÍVEL (EVA)</span>
                          <span className="text-3xl font-black text-blue-600">{selectedAnamnese.pain_level}<span className="text-sm text-slate-300 font-normal">/10</span></span>
                      </div>
                      <div className="md:col-span-2 p-4 bg-white rounded-xl border border-slate-200">
                          <span className="block text-xs font-bold text-slate-400 mb-2">CARACTERÍSTICAS</span>
                          <div className="flex flex-wrap gap-2">
                              {selectedAnamnese.pain_quality ? selectedAnamnese.pain_quality.split(',').map((q:string) => (
                                  <span key={q} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">{q}</span>
                              )) : '-'}
                          </div>
                      </div>
                   </div>
               </div>

               <div className="grid md:grid-cols-2 gap-10 pt-4 border-t border-slate-100">
                  <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><User size={16}/> Histórico e Hábitos</h4>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                          <p className="text-sm text-slate-700"><strong className="text-slate-900">Histórico:</strong> {selectedAnamnese.history_life || '-'}</p>
                          <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${selectedAnamnese.lifestyle_status === 'ATIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                                  {selectedAnamnese.lifestyle_status}
                              </span>
                              {selectedAnamnese.lifestyle_details && <span className="text-sm text-slate-600">({selectedAnamnese.lifestyle_details})</span>}
                          </div>
                      </div>
                  </div>
                  
                  <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Paperclip size={16}/> Exames e Documentos</h4>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 min-h-[100px]">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedAnamnese.exams_complementary || 'Nenhum exame registrado.'}</p>
                      </div>
                  </div>
               </div>

               <div className="pt-6 border-t border-slate-100">
                   <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Plano Terapêutico</h4>
                   <div className="p-6 bg-emerald-50/50 rounded-xl border border-emerald-100">
                       <p className="text-sm text-slate-800 whitespace-pre-wrap leading-7">{selectedAnamnese.therapeutic_plan || '-'}</p>
                   </div>
               </div>

            </div>
          </div>
        </div>
      )}

      {/* 3. MODO CRIAÇÃO (MODAL DIALOG CENTRALIZADO - PADRÃO NOVO) */}
      {mode === 'create' && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          
          <div className="bg-slate-100 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative border border-slate-300">
            
            {/* HEADER DO MODAL */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-4">
                <button onClick={handleCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="text-slate-500"/>
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {formData.id ? <><FileEdit size={22} className="text-amber-500"/> Editando Rascunho</> : 'Nova Avaliação'}
                  </h2>
                  <div className="flex items-center gap-2">
                     <span className="text-xs text-slate-500">Profissional Responsável: <strong className="text-slate-700 uppercase">{userName}</strong></span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                 <button onClick={handleCancel} className="px-5 py-2.5 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm transition-colors">
                    Cancelar
                 </button>
                 
                 <button onClick={() => handleSave('draft')} disabled={saving} className="px-5 py-2.5 bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl hover:bg-amber-200 text-sm transition-colors flex items-center gap-2 shadow-sm">
                    {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Salvar Rascunho
                 </button>
                 
                 <button onClick={() => handleSave('final')} disabled={saving} className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 text-sm">
                   {saving ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} Finalizar Ficha
                 </button>
              </div>
            </div>

            {/* CORPO DO FORMULÁRIO (SCROLL) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 w-full space-y-8 bg-slate-50/50">
              
              {/* Título / Especialidade */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Selecione a Especialidade da Ficha</label>
                <div className="flex gap-3 flex-wrap">
                  {['FISIOTERAPIA', 'PILATES', 'RPG', 'ESTÉTICA', 'OSTEOPATIA', 'ACUPUNTURA', 'QUIROPRAXIA'].map(opt => (
                    <button key={opt} onClick={() => { setFormData(prev => ({...prev, title: opt})); setIsDirty(true); }} className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all transform duration-200 ${formData.title === opt ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:scale-105'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Diagnóstico e Alertas */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-colors group">
                  <label className="block text-xs font-bold text-slate-500 mb-3 uppercase flex items-center gap-2 group-hover:text-blue-600"><Activity size={14}/> Diagnóstico Clínico</label>
                  <textarea className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-700 resize-none text-sm" placeholder="Ex: ENTORSE TORNOZELO GRAU 2..." value={formData.clinical_diagnosis || ''} onChange={e => handleInput('clinical_diagnosis', e.target.value)}/>
                </div>
                <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-100 hover:border-red-300 transition-colors group">
                  <label className="block text-xs font-bold text-red-700 mb-3 uppercase flex items-center gap-2"><AlertTriangle size={14}/> Alertas / Contraindicações</label>
                  <textarea className="w-full h-32 p-4 bg-white border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-200 text-red-700 font-bold placeholder:text-red-200/70 resize-none text-sm" placeholder="Ex: MARCAPASSO, ALERGIA A IODO, HIPERTENSÃO..." value={formData.indication_alert || ''} onChange={e => handleInput('indication_alert', e.target.value)}/>
                </div>
              </div>

              {/* HMA */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 mb-3 uppercase">HMA / Queixas Principais</label>
                  <textarea className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 resize-none text-sm" value={formData.main_complaint || ''} onChange={e => handleInput('main_complaint', e.target.value)}/>
              </div>

              {/* Dor (Multi-Seleção) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-3 flex items-center gap-2"><Activity size={18} className="text-blue-500"/> Avaliação da Dor</h3>
                <div className="grid md:grid-cols-2 gap-10">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">Intensidade (EVA)</label>
                    <div className="flex gap-1 mb-2">
                      {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
                        <button key={v} onClick={() => { setFormData(prev => ({...prev, pain_level: v})); setIsDirty(true); }} className={`flex-1 h-12 rounded-lg font-bold text-sm transition-all ${formData.pain_level === v ? 'bg-blue-600 text-white scale-110 shadow-lg ring-2 ring-blue-300 ring-offset-2' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{v}</button>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 uppercase font-bold px-1"><span>Sem Dor</span><span>Insuportável</span></div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">Qualidade (Múltipla Escolha)</label>
                    <div className="flex flex-wrap gap-2">
                      {['PONTADA', 'QUEIMAÇÃO', 'PULSÁTIL', 'FORMIGAMENTO', 'PESO', 'CHOQUE', 'CONSTANTE', 'INTERMITENTE', 'FISGADA', 'CÓLICA', 'APERTO'].map(q => (
                        <button key={q} onClick={() => togglePainQuality(q)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${painQualities.includes(q) ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{q}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hábitos e Histórico */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase">Hábitos de Vida</h3>
                  <div className="flex gap-4 mb-4">
                    {['SEDENTARIO', 'ATIVO'].map(st => (
                      <button key={st} onClick={() => { setFormData(prev => ({...prev, lifestyle_status: st})); setIsDirty(true); }} className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${formData.lifestyle_status === st ? 'bg-emerald-100 text-emerald-800 border-emerald-200 ring-2 ring-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{st}</button>
                    ))}
                  </div>
                  {formData.lifestyle_status === 'ATIVO' && (
                    <div className="animate-fade-in-down mt-2 flex-1">
                       <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Atividade e Frequência</label>
                       <textarea className="w-full h-full min-h-[100px] p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-emerald-100 resize-none" placeholder="Ex: MUSCULAÇÃO 3X SEMANA, CORRIDA..." value={formData.lifestyle_details || ''} onChange={e => handleInput('lifestyle_details', e.target.value)}/>
                    </div>
                  )}
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
                  <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase">Histórico de Vida</h3>
                  <textarea className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-100 resize-none" placeholder="Profissão, Rotina de trabalho, Vícios, Lesões antigas..." value={formData.history_life || ''} onChange={e => handleInput('history_life', e.target.value)}/>
                </div>
              </div>

              {/* Exames */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative">
                 <div className="flex justify-between mb-3">
                   <label className="block text-xs font-bold text-slate-500 uppercase">Exames Complementares</label>
                   <button className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-100"><Paperclip size={14}/> Anexar Arquivo</button>
                 </div>
                 <textarea className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 resize-none text-sm" placeholder="Descreva os laudos ou clique em anexar..." value={formData.exams_complementary || ''} onChange={e => handleInput('exams_complementary', e.target.value)}/>
              </div>

              {/* Medicamentos e Plano */}
              <div className="grid md:grid-cols-2 gap-6 pb-6">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 mb-3 uppercase">Medicamentos em Uso</label>
                    <textarea className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 resize-none text-sm" value={formData.medications || ''} onChange={e => handleInput('medications', e.target.value)}/>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 mb-3 uppercase flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500"/> Plano Terapêutico (Objetivos)</label>
                    <textarea 
                        onKeyDown={(e) => handleAutoBullet(e, 'therapeutic_plan')} 
                        className="w-full h-32 p-4 bg-emerald-50/30 border border-emerald-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-200 resize-none text-sm text-slate-700" 
                        placeholder="• Pressione ENTER para criar tópicos..." 
                        value={formData.therapeutic_plan || ''} 
                        onChange={e => handleInput('therapeutic_plan', e.target.value)}
                    />
                 </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};