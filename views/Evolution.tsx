/* src/views/Evolution.tsx */
import React, { useState, useEffect } from 'react';
import { Patient } from '../types';
import { generatePatientSummary } from '../services/geminiService';
import { 
    ArrowLeft, Save, Sparkles, X, 
    Copy, ArrowDownLeft, BrainCircuit,
    AlertTriangle, FileText, Stethoscope,
    Maximize2, Minimize2, ChevronDown
} from 'lucide-react';

interface Props {
  patient: Patient;
  onBack: () => void;
  onFinish: () => void;
}

type AiMode = 'assistant' | 'report' | null;

const Evolution: React.FC<Props> = ({ patient, onBack, onFinish }) => {
  // --- ESTADOS DO FORMULÁRIO ---
  const [subjective, setSubjective] = useState('');
  const [painLevel, setPainLevel] = useState(0); 
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // --- ESTADOS DA IA (AURA COPILOT) ---
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>('assistant'); // Default
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // --- LÓGICA: ASSISTENTE (AGORA) ---
  const runAssistant = async () => {
      if (!subjective && !objective) {
          return alert("Para o Assistente funcionar, descreva ao menos o 'Subjetivo' (Queixas) ou 'Objetivo' (Exames).");
      }
      setIsAnalyzing(true);
      setAiResult(null);
      
      try {
          const prompt = `
            ATUE COMO: Supervisor Clínico Especialista.
            
            CONTEXTO DO PACIENTE (ANAMNESE):
            ${(patient as any).notes || 'Histórico não detalhado.'}

            SITUAÇÃO DA SESSÃO ATUAL:
            - Queixa (Subjetivo): ${subjective}
            - Exames (Objetivo): ${objective}
            - Dor: ${painLevel}/10

            SUA MISSÃO:
            1. Cruzar os dados atuais com a anamnese para identificar riscos.
            2. Sugerir uma hipótese diagnóstica para o campo 'Avaliação'.
            3. Propor 3 condutas práticas para o campo 'Plano'.

            FORMATO: Curto, direto e em tópicos.
          `;
          
          // Hack: Usando a função genérica para passar o prompt
          const response = await generatePatientSummary(patient, [{ id: 'curr', description: prompt } as any]);
          setAiResult(response);
      } catch (error) {
          setAiResult("Erro de conexão com Aura AI.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  // --- LÓGICA: RELATÓRIO (PASSADO) ---
  const runReport = async () => {
      setIsAnalyzing(true);
      setAiResult(null);

      try {
          const prompt = `
            ATUE COMO: Auditor de Prontuários.

            DADOS:
            Paciente: ${patient.name}, ${(patient as any).age || ''} anos.
            Histórico Base: ${(patient as any).notes || 'N/A'}

            TAREFA:
            Gere um RELATÓRIO DE PROGRESSO formal baseado no histórico (simulado aqui).
            O relatório deve conter:
            1. Resumo da Admissão.
            2. Evolução do quadro álgico.
            3. Parecer final sobre a necessidade de continuar o tratamento.
          `;

          const response = await generatePatientSummary(patient, [{ id: 'hist', description: prompt } as any]);
          setAiResult(response);
      } catch (error) {
          setAiResult("Erro ao gerar relatório.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleAction = () => {
      if (aiMode === 'assistant') runAssistant();
      else runReport();
  };

  const handleApplyToPlan = () => {
      if (!aiResult) return;
      setPlan(prev => prev ? `${prev}\n\n[Sugestão Aura]:\n${aiResult}` : aiResult);
      // Feedback visual poderia ser adicionado aqui
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-slate-50 relative">
       
       {/* === ÁREA ESQUERDA: FORMULÁRIO === */}
       {/* No mobile, essa área fica oculta se a IA estiver em FullScreen, senão fica visível por baixo */}
       <div className={`flex-1 overflow-y-auto p-4 md:p-8 transition-all duration-300 ${showAiPanel && !isFullScreen ? 'md:mr-[400px]' : ''}`}>
           
           <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
                </button>
                
                {/* Botão Flutuante Desktop (se painel fechado) */}
                {!showAiPanel && (
                    <button 
                        onClick={() => setShowAiPanel(true)}
                        className="hidden md:flex items-center text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                        <Sparkles className="w-4 h-4 mr-2 text-yellow-300" /> Aura AI
                    </button>
                )}
           </div>

           <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-8 pb-24">
                {/* Header Paciente */}
                <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Nova Evolução</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{patient.name}</span>
                            <span className="text-xs text-slate-400">{new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Campos SOAP */}
                <div className="grid gap-6">
                    {/* S */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-bold text-slate-700">
                            <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-xs">S</span>
                            Subjetivo (Relato)
                        </label>
                        <textarea value={subjective} onChange={e => setSubjective(e.target.value)} rows={3} className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="O que o paciente relatou hoje?" />
                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100 w-fit">
                            <span className="text-xs font-bold text-slate-500 uppercase px-2">Dor (EVA)</span>
                            <input type="range" min="0" max="10" value={painLevel} onChange={e => setPainLevel(parseInt(e.target.value))} className="w-32 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            <span className="font-bold text-slate-700 w-6 text-center">{painLevel}</span>
                        </div>
                    </div>

                    {/* O */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-bold text-slate-700">
                            <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center mr-2 text-xs">O</span>
                            Objetivo (Exames)
                        </label>
                        <textarea value={objective} onChange={e => setObjective(e.target.value)} rows={3} className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none" placeholder="O que você observou/testou?" />
                    </div>

                    {/* Botão Trigger Mobile (Apenas aparece no mobile) */}
                    <div className="md:hidden">
                        <button 
                            onClick={() => setShowAiPanel(true)}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
                        >
                            <Sparkles className="w-5 h-5 text-yellow-300" /> Consultar Aura AI
                        </button>
                    </div>

                    {/* A */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-bold text-slate-700">
                            <span className="w-6 h-6 rounded bg-purple-100 text-purple-600 flex items-center justify-center mr-2 text-xs">A</span>
                            Avaliação
                        </label>
                        <textarea value={assessment} onChange={e => setAssessment(e.target.value)} rows={2} className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none" placeholder="Análise do quadro..." />
                    </div>

                    {/* P */}
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-bold text-slate-700">
                            <span className="w-6 h-6 rounded bg-amber-100 text-amber-600 flex items-center justify-center mr-2 text-xs">P</span>
                            Plano
                        </label>
                        <textarea value={plan} onChange={e => setPlan(e.target.value)} rows={4} className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none" placeholder="Conduta e orientações..." />
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onBack} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                    <button onClick={onFinish} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4"/> Salvar</button>
                </div>
           </div>
       </div>

       {/* === ÁREA DIREITA: PAINEL IA (DRAWER/SHEET) === */}
       {/* Desktop: Slide da direita. Mobile: Slide de baixo (Bottom Sheet) */}
       <div 
            className={`
                fixed z-50 transition-all duration-300 ease-in-out bg-white shadow-2xl flex flex-col
                ${isFullScreen ? 'inset-0' : 'top-0 right-0 h-full w-full md:w-[400px]'}
                ${showAiPanel ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}
                ${!isFullScreen && 'md:border-l border-slate-200 rounded-t-[2rem] md:rounded-none mt-10 md:mt-0'}
            `}
       >
           {/* Header IA */}
           <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-4 md:p-6 text-white flex-shrink-0 relative">
               {/* Mobile Drag Handle */}
               <div className="md:hidden w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4"></div>

               <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-2">
                       <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                           <BrainCircuit className="w-6 h-6 text-yellow-300" />
                       </div>
                       <div>
                           <h3 className="font-bold text-lg leading-tight">Aura AI</h3>
                           <p className="text-xs text-indigo-200 opacity-80">Inteligência Clínica</p>
                       </div>
                   </div>
                   <div className="flex gap-2">
                       <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 hover:bg-white/10 rounded-full transition-colors hidden md:block" title="Tela Cheia">
                           {isFullScreen ? <Minimize2 className="w-5 h-5"/> : <Maximize2 className="w-5 h-5"/>}
                       </button>
                       <button onClick={() => setShowAiPanel(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                           {isFullScreen ? <Minimize2 className="w-5 h-5 md:hidden"/> : <ChevronDown className="w-6 h-6 md:hidden"/>}
                           <X className="w-5 h-5 hidden md:block"/>
                       </button>
                   </div>
               </div>

               {/* Seletor de Modo (Dual Mode) */}
               <div className="flex p-1 bg-black/20 rounded-xl backdrop-blur-sm">
                   <button 
                        onClick={() => setAiMode('assistant')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${aiMode === 'assistant' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-100 hover:text-white'}`}
                   >
                       <Stethoscope className="w-4 h-4" /> Assistente
                   </button>
                   <button 
                        onClick={() => setAiMode('report')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${aiMode === 'report' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-100 hover:text-white'}`}
                   >
                       <FileText className="w-4 h-4" /> Relatório
                   </button>
               </div>
           </div>

           {/* Corpo do Painel */}
           <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
               {isAnalyzing ? (
                   <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-pulse">
                       <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                       <div>
                           <h4 className="text-indigo-700 font-bold">Processando...</h4>
                           <p className="text-xs text-slate-500 mt-1">Analisando histórico e contexto.</p>
                       </div>
                   </div>
               ) : aiResult ? (
                   <div className="space-y-6 animate-fade-in-up">
                       <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                           <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50">
                               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                   Resultado ({aiMode === 'assistant' ? 'Assistente' : 'Relatório'})
                               </span>
                               <Sparkles className="w-4 h-4 text-purple-500" />
                           </div>
                           <div className="prose prose-sm prose-indigo text-slate-700 leading-relaxed whitespace-pre-wrap">
                               {aiResult}
                           </div>
                       </div>

                       {/* Ações */}
                       <div className="grid grid-cols-2 gap-3">
                           <button onClick={handleApplyToPlan} className="col-span-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                               <ArrowDownLeft className="w-4 h-4" /> Aplicar no Plano
                           </button>
                           <button onClick={() => navigator.clipboard.writeText(aiResult)} className="py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2">
                               <Copy className="w-4 h-4" /> Copiar
                           </button>
                           <button onClick={() => setAiResult(null)} className="py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">
                               Limpar
                           </button>
                       </div>
                   </div>
               ) : (
                   <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-60">
                       <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                           {aiMode === 'assistant' ? <Stethoscope className="w-8 h-8 text-indigo-300" /> : <FileText className="w-8 h-8 text-indigo-300" />}
                       </div>
                       <div className="max-w-[240px]">
                           <h4 className="text-slate-800 font-bold mb-2">
                               {aiMode === 'assistant' ? 'Assistente em Tempo Real' : 'Gerador de Relatórios'}
                           </h4>
                           <p className="text-sm text-slate-500 leading-relaxed">
                               {aiMode === 'assistant' 
                                ? 'Preencha o formulário e clique abaixo para receber sugestões de conduta baseadas na Anamnese.'
                                : 'Gere um resumo completo da evolução do paciente para documentos e encaminhamentos.'}
                           </p>
                       </div>
                       <button 
                            onClick={handleAction}
                            className="px-8 py-3 bg-white border-2 border-indigo-100 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                       >
                           {aiMode === 'assistant' ? 'Analisar Caso Agora' : 'Gerar Relatório'}
                       </button>
                   </div>
               )}
           </div>
       </div>

       {/* Overlay Mobile (Backdrop) */}
       {showAiPanel && (
           <div className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm" onClick={() => setShowAiPanel(false)} />
       )}
    </div>
  );
};

export default Evolution;