export interface PendingBillingItem {
  item_id: string;
  clinic_id: string; // ✅ NOVO: Agora garantido pela View
  agenda_date: string;
  patient_name: string;
  service_name: string;
  payer_id: string;
  payer_name: string;
  agreement_id: string | null;
  agreement_name: string | null;
  amount_expected: number;
}

export interface BillingGroup {
  groupKey: string;
  payerId: string;
  agreementId: string | null;
  payerName: string;
  agreementName: string;
  totalValue: number;
  items: PendingBillingItem[];
}