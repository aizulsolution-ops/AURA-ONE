/* src/services/geminiService.ts - VERSÃO FINAL: MODO PROFESSOR ATIVO */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Patient, EvolutionRecord } from "../types";

// 1. CAPTURA SEGURA DA CHAVE
const API_KEY = 
  import.meta.env.VITE_GEMINI_API_KEY || 
  process.env.API_KEY || 
  process.env.GEMINI_API_KEY ||
  '';

// 2. INICIALIZAÇÃO DO SDK (Gemini 1.5 Flash - Estável)
const genAI = new GoogleGenerativeAI(API_KEY);

// Definição dos 3 Modos de Operação
export type AnalysisMode = 'session_insight' | 'full_report' | 'clinical_chat';

export const generatePatientSummary = async (
  patient: Patient,
  history: EvolutionRecord[],
  mode: AnalysisMode = 'session_insight',
  userQuestion?: string // Opcional: Para quando o usuário fizer uma pergunta específica ao Chat
): Promise<string> => {

  if (!API_KEY || API_KEY.length < 10) {
    console.error("ERRO: Chave Gemini inválida.");
    return "⚠️ Erro de Configuração: Chave de API não identificada.";
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });

    const patientContext = `PACIENTE: ${patient.name}, ${calculateAge(patient.birth_date)} anos.`;
    
    // 3. ROTEAMENTO DE PERSONAS (PROMPTS)
    let systemRole = "";

    switch (mode) {
      case 'session_insight': 
        // MODO 1: Flashcard Rápido (MANTIDO)
        systemRole = `
          ATUE COMO: Fisioterapeuta Sênior (Estilo Telegráfico).
          OBJETIVO: Flashcard de leitura imediata (Max 40 palavras).
          FORMATO OBRIGATÓRIO:
          ⚠️ ALERTA: [Foco principal]
          📉 EVOLUÇÃO: [Melhorou/Piorou/Estável]
          🎯 PLANO: [1 conduta para hoje]
        `;
        break;

      case 'full_report': 
        // MODO 2: Laudo Formal (MANTIDO)
        systemRole = `
          ATUE COMO: Auditor Clínico. 
          OBJETIVO: Gerar um laudo técnico formal e detalhado baseada nas evoluções.
          Use linguagem culta e técnica.
        `;
        break;

      case 'clinical_chat': 
        // MODO 3: O PROFESSOR (CONFIGURADO) 🎓
        systemRole = `
          ATUE COMO: Professor Universitário Doutor em Fisioterapia e Análises Clínicas.
          
          PERFIL:
          - Vasto conhecimento em biomecânica, fisiologia do exercício e patologia.
          - Especialista nas áreas de atuação da clínica (Traumato, Neuro, Respiratória, Geronto, etc).
          - Didático, porém extremamente técnico e baseado em evidências científicas atuais.

          OBJETIVO:
          - Atuar como mentor clínico para os profissionais da ponta.
          - Analisar o caso apresentado com rigor acadêmico.
          - Sugerir raciocínio clínico avançado, testes ortopédicos ou diagnósticos diferenciais se pertinente.
          
          TOM DE VOZ:
          - Profissional, Mestre, Encorajador e Científico.
        `;
        break;

      default:
        systemRole = "Atue como assistente de saúde útil e prestativo.";
    }

    // Montagem do Prompt
    let prompt = `
      ${systemRole}
      
      DADOS DO PACIENTE:
      ${patientContext}
      
      HISTÓRICO CLÍNICO (EVOLUÇÕES RECENTES):
      ${history.map(h => `- ${h.date}: ${h.description}`).join('\n')}
    `;

    // Se for um chat (Modo 3) e tiver uma pergunta específica, adicionamos ao prompt
    if (mode === 'clinical_chat' && userQuestion) {
      prompt += `\n\nPERGUNTA DO PROFISSIONAL: "${userQuestion}"\n\nRESPOSTA DO PROFESSOR:`;
    }

    console.log(`🤖 Gemini 1.5 Flash atuando como: ${mode}...`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error: any) {
    console.error("❌ ERRO GEMINI:", error);
    if (error.message?.includes('403')) return "⚠️ Erro 403: Chave bloqueada ou sem permissão.";
    return "⚠️ A IA não conseguiu processar. Tente novamente.";
  }
};

function calculateAge(birthDate?: string | null): string {
    if (!birthDate) return "?";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age.toString();
}