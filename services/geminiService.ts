/* src/services/geminiService.ts - VERSÃO BLINDADA VERCEL/VITE */
import { GoogleGenAI } from "@google/genai";
import { Patient, EvolutionRecord } from "../types";

// 1. CAPTURA SEGURA DA CHAVE (Prioriza Vercel/Vite, depois fallback)
// Isso resolve o erro "API Key must be set" porque garante que lemos a variável certa
const API_KEY = 
  import.meta.env.VITE_GEMINI_API_KEY || 
  (typeof process !== 'undefined' ? process.env.API_KEY : '') || 
  '';

// 2. INICIALIZAÇÃO SEGURA
// Se não houver chave, não crashamos o app aqui. Passamos uma string vazia temporária
// ou evitamos instanciar se o SDK permitir (mas o SDK exige string, então tratamos no uso).
const ai = new GoogleGenAI({ apiKey: API_KEY || "dummy_key_to_prevent_crash" });

export type AnalysisMode = 'session_insight' | 'full_report';

export const generatePatientSummary = async (
  patient: Patient,
  history: EvolutionRecord[],
  mode: AnalysisMode = 'session_insight'
): Promise<string> => {

  try {
    // 3. VALIDAÇÃO NA HORA DO USO (Runtime Check)
    // Aqui sim podemos avisar o usuário sem quebrar o site inteiro
    if (!API_KEY || API_KEY === "dummy_key_to_prevent_crash") {
      console.error("ERRO CRÍTICO: Chave Gemini não encontrada. Verifique VITE_GEMINI_API_KEY na Vercel.");
      return "⚠️ Erro de Configuração: Chave de API da IA não está ativa no servidor.";
    }

    // 1. Contexto do Paciente
    const patientContext = `PACIENTE: ${patient.name}, ${calculateAge(patient.birth_date)} anos.`;

    // 2. Definição da Persona (Cérebro Tático)
    let systemInstruction = "";

    if (mode === 'session_insight') {
      systemInstruction = `
        ATUE COMO UM ASSISTENTE CLÍNICO "TELEGRÁFICO".
        OBJETIVO: Criar um FLASHCARD rápido para leitura imediata.
        
        REGRAS RÍGIDAS:
        1. SEM introduções ("Olá", "Segue..."). Vá direto ao ponto.
        2. Use APENAS Bullet Points.
        3. Máximo de 40 palavras.
        
        SAÍDA OBRIGATÓRIA:
        ⚠️ ALERTA: [Ponto de atenção ou dor da última sessão]
        📉 STATUS: [Melhorou, Piorou ou Estável?]
        🎯 CONDUTA: [Sugestão técnica para hoje]
      `;
    } 
    else if (mode === 'full_report') {
      systemInstruction = `Atue como Auditor Clínico. Gere um laudo formal e detalhado.`;
    }

    const prompt = `
      DADOS DO PACIENTE:
      ${patientContext}
      
      HISTÓRICO RECENTE:
      ${history.map(h => `- ${h.date}: ${h.description}`).join('\n')}
      
      GERE O RESUMO AGORA:
    `;

    // Using gemini-3-flash-preview for basic text summarization tasks
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // Atualizado para modelo estável (preview pode falhar)
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    // Directly access the text property as per guidelines
    return response.text || "⚠️ A IA não retornou conteúdo.";
    
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return "⚠️ A IA não conseguiu responder no momento. Verifique sua conexão e chave de API.";
  }
};

// Helper de Idade
function calculateAge(birthDate?: string | null): string {
    if (!birthDate) return "?";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age.toString();
}