

/* src/types.ts - FONTE DA VERDADE (AUDITORIA 18/12 + ATUALIZAÇÃO PRONTUÁRIO V2) */

export enum ViewState {
  LOGIN = 'LOGIN',
  RECOVER_PASSWORD = 'RECOVER_PASSWORD',
  DASHBOARD = 'DASHBOARD',
  AGENDA = 'AGENDA',
  PATIENT_LIST = 'PATIENT_LIST',
  PATIENT_FILE = 'PATIENT_FILE',
  EVOLUTION = 'EVOLUTION',
  REPORTS = 'REPORTS',
  FINANCE = 'FINANCE',
  ADMIN = 'ADMIN',
  PATIENT_PORTAL = 'PATIENT_PORTAL'
}

export enum UserRole {
  MANAGER = 'manager',     // Mapeado de 'admin'/'manager' no banco
  PROFESSIONAL = 'professional', // Mapeado de 'therapist'/'professional'
  RECEPTION = 'reception', // Mapeado de 'receptionist'
  PATIENT = 'patient'
}

// --- INTERFACES BASEADAS NA AUDITORIA DO BANCO ---

export interface Patient {
  id: string;
  clinic_id: string;
  name: string;
  document?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  email?: string | null;
  profile_photo_path?: string | null; // Confirmado na auditoria
  risk_level?: string | null;
  attendance_type?: string | null;
  insurance_id?: string | null;
  // Added missing fields for PatientUI and forms
  insurance_provider_id?: string | null;
  insurance_card_number?: string | null;
  insurance_validity?: string | null;
  insurance_plan?: string | null;
  created_at?: string;
  // Added for mock and UI support
  last_visit?: string | null;
  avatar_url?: string | null;
  package_balance?: number | null;
  // --- FIXED: Added missing fields used in forms ---
  social_name?: string | null;
  gender?: string | null;
  sex?: string | null;
  whatsapp?: string | null;
  profession?: string | null;
  zip_code?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  notes?: string | null;
  meta?: any | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_kinship?: string | null;
}

// Added PatientUI for components that need enriched patient data for display
export interface PatientUI extends Patient {
  age?: number | null;
  active_cycle_title?: string;
  sessions_total?: number;
  sessions_used?: number;
  cpf?: string | null; // Adicionado para garantir compatibilidade com a busca nova
}

// --- ATUALIZADO: Suporte a Evolução Modular (Dor, IA, Procedimentos) ---
export interface ClinicalEvolution {
  id: string;
  clinic_id: string;
  patient_id: string;
  episode_id?: string | null; // AUDITORIA: Nome correto é 'episode_id'
  professional_id?: string | null;
  professional_name?: string | null;
  // Added title field for specialty or activity designation
  title?: string | null;
  
  // Campos SOAP Clássicos
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  
  // Novos Campos (Prontuário V2)
  pain_level?: number | null;        // 0 a 10
  pain_quality?: string | null;      // "Queimação", "Pontada"
  procedures_tags?: string[] | null; // Tags de procedimentos realizados
  ai_summary?: string | null;        // Resumo curto para Timeline
  was_attended?: boolean | null;     // Confirmação de presença
  
  evolved_at: string;
  created_at?: string;
  // --- FIXED: Added evolution_data property ---
  evolution_data?: {
    pain_status?: string;
    pain_level?: number;
    [key: string]: any;
  } | null;
}

// --- NOVO: Interface da Anamnese Estruturada ---
export interface PatientAnamnese {
  id: string;
  clinic_id: string;
  patient_id: string;
  // Added title for anamnesis type identification
  title?: string | null;
  
  // Campos Clínicos
  clinical_diagnosis?: string | null;
  main_complaint?: string | null;     // HMA
  history_life?: string | null;       // Hábitos
  // Added lifestyle fields used in AnamneseTab
  lifestyle_status?: string | null;
  lifestyle_details?: string | null;
  surgical_history?: string | null;
  medications?: string | null;
  family_history?: string | null;
  
  // Exames
  exams_physical?: string | null;
  exams_complementary?: string | null;
  
  // Alertas e Planejamento
  indication_alert?: string | null;
  therapeutic_plan?: string | null;
  
  // Dor Inicial (Marco Zero)
  pain_level?: number | null;
  pain_quality?: string | null;
  pain_location?: string | null;
  
  observations?: string | null;
  updated_at?: string;
}

export interface CareEpisode {
  id: string;
  clinic_id: string;
  patient_id: string;
  title: string; // Tabela 'care_episodes' coluna 'specialty' ou 'title' da view? Usaremos specialty se title não existir, mas o mock usa title.
  status: 'active' | 'closed';
  started_at: string; 
  ended_at?: string | null;
}

export interface AiReport {
  id: string;
  clinic_id: string;
  patient_id?: string | null;
  episode_id?: string | null; // AUDITORIA: Nome correto é 'episode_id'
  author_id: string;
  report_type: 'summary' | 'chat' | 'suggestion'; // AUDITORIA: Nome correto é 'report_type'
  status: 'draft' | 'final' | 'processed';
  content: any; // AUDITORIA: Nome correto é 'content' (JSONB)
  content_text?: string | null;
  pdf_url?: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  professional_id?: string | null;
  starts_at: string;
  ends_at?: string | null;
  status: 'scheduled' | 'confirmed' | 'completed' | 'canceled' | 'no_show';
  notes?: string | null;
  // Added for mock support
  patientName?: string;
  time?: string;
  type?: string;
  professional?: string;
  avatar?: string;
}

export interface InsuranceProvider {
  id: string;
  name: string;
  is_active: boolean;
  clinic_id: string;
  // Added for mock support
  planType?: string;
  daysToPay?: number;
  contactPhone?: string;
}

export interface PatientDocument {
  id: string;
  display_name: string;
  file_type: string;
  storage_path: string;
  created_at: string;
}

// --- INTERFACES DE UI ---
export interface EvolutionRecord {
  id: string;
  date: string;
  professional: string;
  description: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  // Added for mock support
  attachments?: string[];
}

// Added missing interfaces exported for constants.ts
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  status: 'paid' | 'pending';
  paymentMethod: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  category: string;
  isRecurring: boolean;
  status: 'paid' | 'pending';
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  avatar?: string;
}

