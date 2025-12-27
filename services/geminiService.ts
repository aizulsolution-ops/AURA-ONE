/* src/services/geminiService.ts - VERSÃO ERP CAPITAL (2.0 FLASH + DIAGNÓSTICO) */
import { Patient, EvolutionRecord } from "../types";

// 1. CAPTURA SEGURA DA CHAVE
const API_KEY = 
  import.meta.env.VITE_GEMINI_API_KEY || 
  process.env.API_KEY || 
  process.env.GEMINI_API_KEY ||
  '';

// URL BASE (v1beta)
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// MODELO ALVO (Igual ao ERP Capital/Chat Marina)
const MODEL_NAME = "gemini-2.0-flash"; 

export type AnalysisMode = 'session_insight' | 'full_report' | 'clinical_chat';

// --- FUNÇÃO AUXILIAR: CONSULTA MODELOS DISPONÍVEIS ---
// Roda automaticamente se a geração falhar para te mostrar o que está disponível
async function logAvailableModels() {
  try {
    console.log("🔍 Consultando modelos disponíveis para esta Chave API...");
    const response = await fetch(`${BASE_URL}/models?key=${API_KEY}`);
    const data = await response.json();
    
    if (data.models) {
      console.log("✅ MODELOS DISPONÍVEIS NA SUA CONTA:");
      console.table(data.models.map((m: any) => ({ 
        name: m.name.replace('models/', ''), 
        methods: m.supportedGenerationMethods 
      })));
    } else {
      console.error("❌ Não foi possível listar modelos:", data);
    }
  } catch (e) {
    console.error("❌ Erro ao consultar modelos:", e);
  }
}

export const generatePatientSummary = async (
  patient: Patient,
  history: EvolutionRecord[],
  mode: AnalysisMode = 'session_insight',
  userQuestion?: string
): Promise<string> => {

  if (!API_KEY || API_KEY.length < 10) {
    return "⚠️ Erro de Configuração: Chave de API inválida.";
  }

  try {
    const patientContext = `PACIENTE: ${patient.name}, ${calculateAge(patient.birth_date)} anos.`;
    
    // 2. CONSTRUÇÃO DO PROMPT
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
        systemRole = `ATUE COMO: Auditor Clínico. Gere laudo técnico formal.`;
        break;

      case 'clinical_chat': 
        systemRole = `ATUE COMO: Professor Universitário Doutor em Fisioterapia. Mentoria clínica.`;
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
      finalPrompt += `\n\nPERGUNTA: "${userQuestion}"\n\nRESPOSTA:`;
    }

    // 3. CHAMADA REST (PADRÃO ERP CAPITAL)
    console.log(`🤖 Tentando conexão com: ${MODEL_NAME}...`);

    const response = await fetch(`${BASE_URL}/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }]
      })
    });

    const data = await response.json();

    // 4. TRATAMENTO DE ERRO + AUTO-DIAGNÓSTICO
    if (!response.ok) {
      console.error("ERRO API:", data);
      
      // SE DER ERRO, CHAMA A CONSULTA DE MODELOS
      await logAvailableModels();

      if (data.error?.message?.includes('not found')) {
        return `⚠️ Modelo ${MODEL_NAME} não encontrado. Olhe o Console (F12) para ver a lista de modelos disponíveis.`;
      }
      return `⚠️ Erro da IA: ${data.error?.message || 'Falha desconhecida'}`;
    }

    if (data.candidates && data.candidates.length > 0) {
       return data.candidates[0].content.parts[0].text;
    }

    return "⚠️ A IA não retornou texto válido.";

  } catch (error: any) {
    console.error("❌ ERRO FETCH:", error);
    return "⚠️ Falha na conexão. Verifique sua internet.";
  }
};

function calculateAge(birthDate?: string | null): string {
    if (!birthDate) return "?";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    if ((today.getMonth() < birth.getMonth()) || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age.toString();
}