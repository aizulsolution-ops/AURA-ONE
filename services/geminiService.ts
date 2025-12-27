/* src/services/geminiService.ts - VERSÃO FINAL VERCEL FIX */
import { GoogleGenAI } from "@google/genai";
import { Patient, EvolutionRecord } from "../types";

/**
 * CAPTURA SEGURA DA CHAVE
 * O Vite substitui 'process.env.API_KEY' pelo valor real da Vercel no momento do Build.
 * Removemos a checagem de 'typeof process' pois ela bloqueava a leitura no navegador.
 */
const API_KEY = 
  import.meta.env.VITE_GEMINI_API_KEY || 
  process.env.API_KEY || 
  process.env.GEMINI_API_KEY ||
  '';

// Inicialização com chave real ou dummy para evitar crash imediato
const ai = new GoogleGenAI({ apiKey: API_KEY || "dummy_key" });

export type AnalysisMode = 'session_insight' | 'full_report';

export const generatePatientSummary = async (
  patient: Patient,
  history: EvolutionRecord[],
  mode: AnalysisMode = 'session_insight'
): Promise<string> => {

  // DEBUG: Para verificação no Console do Navegador (F12)
  console.log('--- DEBUG GEMINI SERVICE ---');
  console.log('Status da Chave:', API_KEY && API_KEY !== 'dummy_key' ? '✅ CARREGADA' : '❌ VAZIA/INVÁLIDA');
  
  if (!API_KEY || API_KEY === "dummy_key" || API_KEY.length < 10) {
    console.error("ERRO CRÍTICO: Chave Gemini inválida ou não encontrada.");
    return "⚠️ Erro de Configuração: Chave de API da IA não está ativa no servidor.";
  }

  try {
    // 1. Contexto
    const patientContext = `PACIENTE: ${patient.name}, ${calculateAge(patient.birth_date)} anos.`;

    // 2. Persona
    let systemInstruction = "";

    if (mode === 'session_insight') {
      systemInstruction = `
        ATUE COMO UM ASSISTENTE CLÍNICO "TELEGRÁFICO".
        OBJETIVO: Criar um FLASHCARD rápido para leitura imediata.
        
        REGRAS RÍGIDAS:
        1. SEM introduções. Vá direto ao ponto.
        2. Use APENAS Bullet Points.
        3. Máximo de 40 palavras.
        
        SAÍDA OBRIGATÓRIA:
        ⚠️ ALERTA: [Ponto de atenção]
        📉 STATUS: [Melhorou/Piorou/Estável]
        🎯 CONDUTA: [Sugestão técnica]
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

    // Chamada à API
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', 
      contents: prompt,
      config: { systemInstruction },
    });

    return response.text || "⚠️ A IA não retornou conteúdo.";
    
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return "⚠️ A IA não conseguiu responder. Verifique sua conexão.";
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