/* src/services/patientService.ts - VERSÃO ATUALIZADA (VIEW INTEGRATION) */
import { supabase } from './supabase';
import { Patient, ClinicalEvolution, Appointment, InsuranceProvider, CareEpisode, AiReport } from '../types';

// --- TIPOS DE VIEW (Mapeamento do Banco) ---
export interface PatientProgress {
  patient_id: string;
  cycle_title: string;
  total_sessions: number;
  sessions_used: number;
  active: boolean;
}

export interface TimelineEvent {
  event_id: string; // ID único (seja evolucao ou anamnese)
  patient_id: string;
  timeline_at: string; // Data para ordenação
  timeline_type: 'evolution' | 'anamnesis';
  title: string; // Especialidade ou Título
  professional_name: string;
  summary: string; // Subjetivo ou Queixa principal
  details?: string; // Análise/Plano ou Diagnóstico
  status_label?: string; // Melhora/Piora
  pain_level?: number;
}

// --- 1. PATIENT ---

export const listPatients = async (): Promise<Patient[]> => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('is_archived', false)
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Patient[];
  } catch (err) {
    console.error("Erro ao listar pacientes:", err);
    return [];
  }
};

export const getPatientById = async (patientId: string): Promise<Patient | null> => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();
    if (error) throw error;
    return data as Patient;
  } catch (err) {
    return null;
  }
};

export const updatePatient = async (patientId: string, payload: Partial<Patient>) => {
  try {
    const validPayload = {
        name: payload.name,
        document: payload.document,
        birth_date: payload.birth_date,
        phone: payload.phone,
        email: payload.email,
        risk_level: payload.risk_level,
        attendance_type: payload.attendance_type,
        insurance_id: payload.insurance_id,
        insurance_plan: payload.insurance_plan,
        profile_photo_path: payload.profile_photo_path
    };
    // Remove chaves undefined
    Object.keys(validPayload).forEach(key => (validPayload as any)[key] === undefined && delete (validPayload as any)[key]);

    const { error } = await supabase.from('patients').update(validPayload).eq('id', patientId);
    if (error) throw error;
  } catch (err) {
    console.error("Erro updatePatient:", err);
    throw err;
  }
};

// --- 2. INTEGRAÇÃO COM VIEWS (NOVO) ---

export const getPatientProgress = async (patientId: string): Promise<PatientProgress | null> => {
    try {
        const { data, error } = await supabase
            .from('view_patient_progress')
            .select('*')
            .eq('patient_id', patientId)
            .eq('active', true)
            .single();
        
        if (error) return null;
        return data as PatientProgress;
    } catch {
        return null;
    }
};

export const getPatientUnifiedTimeline = async (patientId: string): Promise<TimelineEvent[]> => {
    try {
        const { data, error } = await supabase
            .from('patient_timeline_v')
            .select('*')
            .eq('patient_id', patientId)
            .order('timeline_at', { ascending: false });

        if (error) throw error;

        // Mapear retorno da View para interface limpa do Front
        return data.map((item: any) => ({
            event_id: item.evolution_id || item.anamnesis_id || item.session_id, // Fallback de IDs
            patient_id: item.patient_id,
            timeline_at: item.timeline_at,
            timeline_type: item.timeline_type === 'anamnese' ? 'anamnesis' : 'evolution',
            title: item.episode_specialty || item.title || 'ATENDIMENTO',
            professional_name: item.author_name || 'Profissional',
            summary: item.evolution_note || item.main_complaint || '', // View deve entregar colunas consolidadas
            details: item.evolution_data?.plan || item.clinical_diagnosis || '',
            status_label: item.evolution_data?.pain_status || '',
            pain_level: item.evolution_data?.pain_level || 0
        }));
    } catch (err) {
        console.error("Erro Timeline Unificada:", err);
        return [];
    }
};

// --- 3. CARE EPISODES ---
export const getCareEpisodes = async (patientId: string): Promise<CareEpisode[]> => {
  try {
    const { data, error } = await supabase
      .from('care_episodes')
      .select('*')
      .eq('patient_id', patientId)
      .order('status', { ascending: true });
    
    if (error) return [];
    
    return data.map((d: any) => ({
        id: d.id,
        clinic_id: d.clinic_id,
        patient_id: d.patient_id,
        title: d.specialty || 'Sem Título', 
        status: d.status,
        started_at: d.started_at,
        ended_at: d.ended_at
    })) as CareEpisode[];
  } catch { return []; }
};

export const createCareEpisode = async (payload: Partial<CareEpisode>): Promise<CareEpisode | null> => {
    try {
        const dbPayload = {
            clinic_id: payload.clinic_id,
            patient_id: payload.patient_id,
            specialty: payload.title || 'Atendimento Geral',
            status: payload.status || 'active',
            started_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('care_episodes')
            .insert([dbPayload])
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            clinic_id: data.clinic_id,
            patient_id: data.patient_id,
            title: data.specialty,
            status: data.status,
            started_at: data.started_at
        } as CareEpisode;
    } catch (err) {
        console.error("Erro criar episodio:", err);
        return null;
    }
};

// --- 4. EVOLUTIONS ---
export const listEvolutions = async (patientId: string, episodeId?: string): Promise<ClinicalEvolution[]> => {
  try {
    let query = supabase
      .from('clinical_evolutions')
      .select('*')
      .eq('patient_id', patientId)
      .order('evolved_at', { ascending: false });

    if (episodeId) {
      query = query.eq('episode_id', episodeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as ClinicalEvolution[];
  } catch { return []; }
};

export const createEvolution = async (payload: Partial<ClinicalEvolution>): Promise<ClinicalEvolution | null> => {
  try {
    if (!payload.patient_id) throw new Error("ID do paciente obrigatório");
    if (!payload.episode_id) throw new Error("ID do episódio obrigatório (Banco Not Null)");

    const evolutionData = {
        clinic_id: payload.clinic_id,
        patient_id: payload.patient_id,
        episode_id: payload.episode_id, 
        subjective: payload.subjective,
        objective: payload.objective,
        assessment: payload.assessment,
        plan: payload.plan,
        professional_id: payload.professional_id, 
        professional_name: payload.professional_name,
        evolved_at: payload.evolved_at || new Date().toISOString(),
        title: payload.title, // Importante: Salvar o título da especialidade
        pain_level: payload.pain_level,
        procedures_tags: payload.procedures_tags
    };

    const { data, error } = await supabase
      .from('clinical_evolutions')
      .insert([evolutionData])
      .select()
      .single();

    if (error) throw error;
    return data as ClinicalEvolution;
  } catch (err) {
    console.error("Erro createEvolution:", err);
    throw err;
  }
};

// --- 5. AI REPORTS ---
export const getAiReports = async (patientId: string): Promise<AiReport[]> => {
  try {
    const { data, error } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data as AiReport[];
  } catch { return []; }
};

// --- UTILS ---
export const listPatientAppointments = async (patientId: string): Promise<Appointment[]> => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('starts_at', { ascending: false })
      .limit(10);
    if (error) return [];
    return data as Appointment[];
  } catch { return []; }
};

export const listInsuranceProviders = async (clinicId: string): Promise<InsuranceProvider[]> => {
  try {
    const { data, error } = await supabase.from('insurance_providers').select('*').eq('clinic_id', clinicId);
    if (error) return [];
    return data as InsuranceProvider[];
  } catch { return []; }
};