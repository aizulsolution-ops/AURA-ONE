export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string
          name: string
          document: string | null // CPF
          profile_photo_path: string | null
          birth_date: string | null
          contact_info: Json | null // Telefone, email
          risk_level: 'low' | 'medium' | 'high' | null
          created_at: string
        }
      }
      care_episodes: {
        Row: {
          id: string
          patient_id: string
          title: string // Ex: "Tratamento Ombro"
          status: 'active' | 'closed'
          start_date: string
          end_date: string | null
        }
      }
      clinical_evolutions: {
        Row: {
          id: string
          patient_id: string
          care_episode_id: string | null // Pode ser nulo se for geral
          professional_id: string
          subjective: string // S
          objective: string  // O
          assessment: string // A
          plan: string       // P
          evolved_at: string // A data oficial da evolução
          created_at: string
        }
      }
      ai_reports: {
        Row: {
          id: string
          patient_id: string
          care_episode_id: string | null
          content: Json | null // O texto/estrutura gerada pela IA
          status: 'draft' | 'final' | 'processed'
          type: 'summary' | 'chat_history' | 'suggestion'
          created_at: string
        }
      }
    }
  }
}