/* src/services/agendaService.ts - VERSÃO 2.0 (FULL RESTORE + DAY CLOSING) */
import { supabase } from './supabase';

/**
 * 3. STATUS OFICIAL (ENUM LÓGICO)
 * Atualizado para incluir todos os status permitidos pelo banco
 */
export type AgendaStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'done' | 'no_show' | 'canceled';

/**
 * 2.2 Colunas - contrato exato
 */
export interface AgendaEvent {
  id: string;
  clinic_id: string;
  patient_id?: string;
  assigned_to_profile_id?: string;
  title?: string;
  start_at: string; // timestamptz
  end_at: string;   // timestamptz
  status: AgendaStatus;
  notes?: string;
  specialty_id?: string;
  specialty?: string; // Retorno auxiliar da RPC v2
  cancel_reason_id?: string;
  is_exception: boolean;
}

export interface Specialty {
    id: string;
    name: string;
    color_hex?: string;
}

// --- CORE: LEITURA E ESCRITA ---

/**
 * 5. LISTAGEM OFICIAL
 * Usa RPC ou Query direta dependendo da necessidade
 */
export const listAgendaEvents = async (params: {
  clinicId: string;
  date: string; // YYYY-MM-DD
  profileId?: string;
}) => {
  try {
    // Busca direta para garantir compatibilidade com filtros manuais do Front e Status novos
    let query = supabase
      .from('agenda_events')
      .select('*')
      .eq('clinic_id', params.clinicId)
      .gte('start_at', `${params.date}T00:00:00`)
      .lte('start_at', `${params.date}T23:59:59`)
      .order('start_at', { ascending: true });

    if (params.profileId) {
      query = query.eq('assigned_to_profile_id', params.profileId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as AgendaEvent[];
  } catch (err) {
    console.error("Erro Contrato Agenda (List):", err);
    return [];
  }
};

/**
 * 4.1 Criar sessão
 */
export const createSingleAppointment = async (payload: Partial<AgendaEvent>) => {
  try {
    const dbPayload = {
        clinic_id: payload.clinic_id,
        patient_id: payload.patient_id,
        assigned_to_profile_id: payload.assigned_to_profile_id,
        specialty_id: payload.specialty_id,
        title: payload.title,
        start_at: payload.start_at,
        end_at: payload.end_at,
        status: payload.status || 'scheduled',
        notes: payload.notes,
        is_exception: false
    };

    const { data, error } = await supabase
      .from('agenda_events')
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Erro Contrato Agenda (Create):", err);
    throw err;
  }
};

/**
 * 4.2 Editar sessão (CORREÇÃO OBRIGATÓRIA: WHITELIST)
 */
export const updateAgendaEvent = async (eventId: string, payload: Partial<AgendaEvent>) => {
    try {
        const safePayload: any = {};
        if (payload.start_at !== undefined) safePayload.start_at = payload.start_at;
        if (payload.end_at !== undefined) safePayload.end_at = payload.end_at;
        if (payload.assigned_to_profile_id !== undefined) safePayload.assigned_to_profile_id = payload.assigned_to_profile_id;
        if (payload.specialty_id !== undefined) safePayload.specialty_id = payload.specialty_id;
        if (payload.notes !== undefined) safePayload.notes = payload.notes;
        if (payload.status !== undefined) safePayload.status = payload.status;
        
        // updated_at removido (Trigger do banco cuida disso)

        const { error } = await supabase
            .from('agenda_events')
            .update(safePayload)
            .eq('id', eventId);
        
        if (error) throw error;
        return true;
    } catch (err) {
        console.error("Erro Contrato Agenda (Update):", err);
        return false;
    }
};

/**
 * 4.3 Cancelar sessão (LÓGICO)
 */
export const cancelAgendaEvent = async (eventId: string, reasonId?: string) => {
    try {
        const { error } = await supabase
            .from('agenda_events')
            .update({ 
                status: 'canceled', 
                cancel_reason_id: reasonId || null
            })
            .eq('id', eventId);

        if (error) throw error;
        return true;
    } catch (err) {
        return false;
    }
};

/**
 * AUXILIAR: Listar Especialidades
 */
export const listSpecialties = async () => {
    try {
        const { data } = await supabase.from('specialties').select('*');
        return data as Specialty[] || [];
    } catch { return []; }
};

/**
 * AUXILIAR: Fechar o Dia (Legado via RPC - mantido para compatibilidade se necessário)
 */
export const closeClinicDay = async (clinicId: string, date: string) => {
    try {
        const { data, error } = await supabase.rpc('agenda_close_day', {
            p_clinic_id: clinicId,
            p_day: date,
            p_target_status: 'no_show'
        });
        if (error) throw error;
        return data as number;
    } catch (err) {
        throw err;
    }
};

export const listClinicProfessionals = async (clinicId: string) => {
    try {
        const { data } = await supabase.from('profiles_v').select('id, name, role, specialty_name').eq('clinic_id', clinicId).neq('role', 'receptionist');
        return data || [];
    } catch { return []; }
};

// ============================================================================
// NOVAS FUNÇÕES DE FECHAMENTO INTELIGENTE (DAY CLOSING WIZARD)
// ============================================================================

/**
 * Busca estatísticas e lista de pacientes pendentes para o fechamento
 */
export const getClosingStats = async (clinicId: string, date: string) => {
    try {
        const { data, error } = await supabase
            .from('agenda_events')
            .select(`
                id, status, start_at, 
                patients ( name, phone )
            `)
            .eq('clinic_id', clinicId)
            .gte('start_at', `${date}T00:00:00`)
            .lte('start_at', `${date}T23:59:59`);

        if (error) throw error;

        // Processa os dados para o Front
        const stats = {
            total: data.length,
            attended: data.filter(e => ['done', 'finished', 'checked_in', 'in_progress'].includes(e.status)).length,
            canceled: data.filter(e => ['canceled', 'cancelled'].includes(e.status)).length,
            no_show: data.filter(e => e.status === 'no_show').length,
            // Pendentes são aqueles que o dia acabou e não tiveram desfecho final
            pending: data.filter(e => ['scheduled', 'confirmed'].includes(e.status)).map(e => ({
                id: e.id,
                patient_name: (e.patients as any)?.name || 'Paciente',
                patient_phone: (e.patients as any)?.phone || '',
                time: new Date(e.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }))
        };

        return stats;
    } catch (err) {
        console.error("Erro Stats:", err);
        throw err;
    }
};

/**
 * Atualiza status em lote (Bulk Update)
 * Usado pelo Wizard de Fechamento para marcar 'no_show' em massa
 */
export const batchUpdateStatus = async (eventIds: string[], newStatus: AgendaStatus) => {
    if (eventIds.length === 0) return;
    
    const { error } = await supabase
        .from('agenda_events')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in('id', eventIds);

    if (error) throw error;
    return true;
};