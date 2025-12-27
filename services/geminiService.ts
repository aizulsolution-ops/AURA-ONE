
/* src/services/geminiService.ts - VERSÃO COM @google/genai E ENV API KEY */
import { GoogleGenAI } from "@google/genai";
import { Patient, EvolutionRecord } from "../types";

// Always use process.env.API_KEY obtained exclusively from the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export type AnalysisMode = 'session_insight' | 'full_report';

export const generatePatientSummary = async (
  patient: Patient,
  history: EvolutionRecord[],
  mode: AnalysisMode = 'session_insight'
): Promise<string> => {

  try {
    // Validação de segurança: o SDK requer a chave configurada
    if (!process.env.API_KEY) {
      return "⚠️ Erro: Chave de API não configurada.";
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
      model: 'gemini-3-flash-preview',
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
