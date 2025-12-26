/* src/services/geminiService.ts - VERSÃO COM CHAVE DIRETA */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Patient, EvolutionRecord } from "../types";

// ✅ SUA CHAVE DO GOOGLE CLOUD (Copiada do seu print)
const API_KEY = "AIzaSyBs1RGBm9BMGqsc_0iZ1h75hoCADUYMlTg";

const genAI = new GoogleGenerativeAI(API_KEY);

export type AnalysisMode = 'session_insight' | 'full_report';

export const generatePatientSummary = async (
  patient: Patient,
  history: EvolutionRecord[],
  mode: AnalysisMode = 'session_insight'
): Promise<string> => {

  try {
    // Validação de segurança básica
    if (!API_KEY || API_KEY.length < 10) {
      return "⚠️ Erro: Chave de API inválida.";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
      ${systemInstruction}
      
      DADOS DO PACIENTE:
      ${patientContext}
      
      HISTÓRICO RECENTE:
      ${history.map(h => `- ${h.date}: ${h.description}`).join('\n')}
      
      GERE O RESUMO AGORA:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return "⚠️ A IA não conseguiu responder. Verifique se a 'Generative Language API' está ativada no Google Cloud.";
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