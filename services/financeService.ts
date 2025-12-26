import { supabase } from './supabase';
import { PendingBillingItem } from '../types/finance';

export const financeService = {
  // LEITURA BLINDADA (Conforme Contrato Seção 1)
  getPendingItems: async (clinicId: string) => {
    const { data, error } = await supabase
      .from('billing_pending_items_v')
      .select('*')
      .eq('clinic_id', clinicId); // ✅ FILTRO REATIVADO E OBRIGATÓRIO

    if (error) throw error;
    return data as PendingBillingItem[];
  },

  // ESCRITA ATÔMICA (Conforme Contrato Seção 2)
  createBatch: async (payload: {
    clinicId: string;
    payerId: string;
    agreementId: string | null;
    itemIds: string[];
  }) => {
    const { data, error } = await supabase.rpc('billing_create_batch', {
      p_clinic_id: payload.clinicId,
      p_payer_id: payload.payerId,
      p_agreement_id: payload.agreementId,
      p_item_ids: payload.itemIds,
    });

    if (error) throw error;
    return data; 
  }
};