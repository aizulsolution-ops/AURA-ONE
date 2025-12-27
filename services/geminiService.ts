/* src/services/geminiService.ts - ARQUITETURA REST (IGUAL ERP CAPITAL) */
import { Patient, EvolutionRecord } from "../types";

// 1. CAPTURA SEGURA DA CHAVE
const API_KEY = 
  import.meta.env.VITE_GEMINI_API_KEY || 
  process.env.API_KEY || 
  process.env.GEMINI_API_KEY ||
  '';

// URL direta da API (Mesmo padrão do ERP Capital, mas usando modelo Estável 1.5)
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export type AnalysisMode = 'session_insight' | 'full_report' | 'clinical_chat';

export const generatePatientSummary = async (
  patient: Patient,
  history: EvolutionRecord[],
  mode: AnalysisMode = 'session_insight',
  userQuestion?: string
): Promise<string> => {

  // Validação
  if (!API_KEY || API_KEY.length < 10) {
    console.error("ERRO: Chave API inválida/vazia.");
    return "⚠️ Erro de Configuração: Chave de API não identificada no servidor.";
  }

  try {
    const patientContext = `PACIENTE: ${patient.name}, ${calculateAge(patient.birth_date)} anos.`;
    
    // 2. CONSTRUÇÃO DO PROMPT (MANTENDO A LÓGICA DO AURA ONE)
    let systemRole = "";

    switch (mode) {
      case 'session_insight': 
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
        systemRole = `
          ATUE COMO: Auditor Clínico. 
          OBJETIVO: Gerar um laudo técnico formal e detalhado baseada nas evoluções.
          Use linguagem culta e técnica.
        `;
        break;

      case 'clinical_chat': 
        systemRole = `
          ATUE COMO: Professor Universitário Doutor em Fisioterapia.
          OBJETIVO: Mentoria clínica baseada em evidências.
          TOM: Profissional, Acadêmico e Encorajador.
        `;
        break;
    }

    let finalPrompt = `
      ${systemRole}
      
      DADOS DO PACIENTE:
      ${patientContext}
      
      HISTÓRICO RECENTE:
      ${history.map(h => `- ${h.date}: ${h.description}`).join('\n')}
    `;

    if (mode === 'clinical_chat' && userQuestion) {
      finalPrompt += `\n\nPERGUNTA DO PROFISSIONAL: "${userQuestion}"\n\nRESPOSTA DO PROFESSOR:`;
    }

    // 3. CHAMADA REST (MÉTODO "MARINA/ERP CAPITAL")
    // Removemos a dependência do SDK e usamos fetch puro
    console.log(`🤖 Enviando requisição REST para Gemini (${mode})...`);

    const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: finalPrompt }] 
        }]
      })
    });

    const data = await response.json();

    // Tratamento de erro da API
    if (!response.ok) {
      console.error("ERRO REST API:", data);
      if (data.error?.message) return `⚠️ Erro da IA: ${data.error.message}`;
      return "⚠️ A IA recusou a conexão.";
    }

    // Extração da resposta (Estrutura padrão do Google)
    if (data.candidates && data.candidates.length > 0) {
       return data.candidates[0].content.parts[0].text;
    }

    return "⚠️ A IA não retornou texto válido.";

  } catch (error: any) {
    console.error("❌ ERRO FETCH:", error);
    return "⚠️ Falha na conexão com o Google. Verifique sua internet.";
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