
/* src/constants.ts */
import { Patient, Appointment, EvolutionRecord, Transaction, Expense, InsuranceProvider, SystemUser, UserRole } from "./types";

export const MOCK_INSURANCE_PROVIDERS: InsuranceProvider[] = [
  { id: 'ins1', clinic_id: 'demo', name: 'Amil Saúde', is_active: true, planType: 'Blue 300', daysToPay: 30, contactPhone: '0800 123 4567' },
  { id: 'ins2', clinic_id: 'demo', name: 'Bradesco Saúde', is_active: true, planType: 'Top Nacional', daysToPay: 21, contactPhone: '0800 987 6543' },
  { id: 'ins3', clinic_id: 'demo', name: 'SulAmérica', is_active: true, planType: 'Especial 100', daysToPay: 45, contactPhone: '0800 555 1212' },
  { id: 'ins4', clinic_id: 'demo', name: 'Unimed', is_active: true, planType: 'Uniplan', daysToPay: 30, contactPhone: '0800 777 8888' },
];

export const MOCK_USERS: SystemUser[] = [
  { id: 'u1', name: 'Dra. Alana', email: 'alana@clinica.com', role: UserRole.MANAGER, status: 'Active', avatar: 'https://picsum.photos/100/100?random=20' },
  { id: 'u2', name: 'Ana (Recepção)', email: 'ana@clinica.com', role: UserRole.RECEPTION, status: 'Active', avatar: 'https://picsum.photos/100/100?random=21' },
  { id: 'u3', name: 'Dr. Roberto', email: 'roberto@clinica.com', role: UserRole.PROFESSIONAL, status: 'Active', avatar: 'https://picsum.photos/100/100?random=22' },
];

export const EMPTY_PATIENT: Patient = {
  id: 'new',
  clinic_id: '',
  name: '',
  phone: '',
  email: '',
  risk_level: 'Baixo',
  attendance_type: 'Particular',
  insurance_id: ''
};

// Mocks atualizados para bater com a interface Patient do Banco
export const MOCK_PATIENTS: Patient[] = [
  {
    id: 'p1',
    clinic_id: 'demo',
    name: 'Isabella Ross',
    phone: '(11) 99999-9999',
    last_visit: '15/10/2023',
    risk_level: 'Baixo', // Ajustado de VIP para enum compatível ou string
    avatar_url: 'https://picsum.photos/100/100?random=1',
    package_balance: 4,
    attendance_type: 'Particular'
  },
  {
    id: 'p2',
    clinic_id: 'demo',
    name: 'Mariana Silva',
    phone: '(11) 98888-8888',
    last_visit: '20/09/2023',
    risk_level: 'Alto',
    avatar_url: 'https://picsum.photos/100/100?random=2',
    package_balance: 0,
    attendance_type: 'Convênio',
    insurance_id: 'ins1'
  },
  {
    id: 'p3',
    clinic_id: 'demo',
    name: 'Carlos Mendes',
    phone: '(11) 97777-7777',
    last_visit: '10/10/2023',
    risk_level: 'Baixo',
    avatar_url: 'https://picsum.photos/100/100?random=3',
    package_balance: 8,
    attendance_type: 'Particular'
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    clinic_id: 'demo',
    patient_id: 'p1',
    patientName: 'Isabella Ross',
    starts_at: '2023-10-24T09:00:00', // ISO
    time: '09:00', // Legacy UI
    type: 'Fisioterapia Ortopédica',
    professional: 'Dra. Alana',
    // Corrected from 'Confirmado' to match the allowed status values
    status: 'confirmed',
    avatar: 'https://picsum.photos/100/100?random=1',
  },
  {
    id: 'a2',
    clinic_id: 'demo',
    patient_id: 'p2',
    patientName: 'Mariana Silva',
    starts_at: '2023-10-24T10:30:00',
    time: '10:30',
    type: 'Avaliação Funcional',
    professional: 'Dra. Alana',
    // Corrected from 'Agendado'
    status: 'scheduled',
    avatar: 'https://picsum.photos/100/100?random=2',
  },
  {
    id: 'a3',
    clinic_id: 'demo',
    patient_id: 'p3',
    patientName: 'Carlos Mendes',
    starts_at: '2023-10-24T14:00:00',
    time: '14:00',
    type: 'Osteopatia',
    professional: 'Dr. Roberto',
    // Corrected from 'Finalizado'
    status: 'completed',
    avatar: 'https://picsum.photos/100/100?random=3',
  },
];

export const MOCK_EVOLUTION: EvolutionRecord[] = [
  {
    id: 'e1',
    date: '15/10/2023',
    professional: 'Dra. Alana',
    subjective: 'Paciente relata melhora na dor lombar, EVA 3/10.',
    objective: 'ADM de flexão de tronco aumentada em 10 graus.',
    assessment: 'Melhora progressiva da mobilidade lombar.',
    plan: 'Manter exercícios de fortalecimento de core.',
    description: 'Sessão focada em mobilidade.',
    attachments: ['https://picsum.photos/200/200?random=10']
  }
];

export const CHART_DATA = [
  { name: 'Seg', visits: 40, revenue: 2400 },
  { name: 'Ter', visits: 30, revenue: 1398 },
  { name: 'Qua', visits: 20, revenue: 9800 },
  { name: 'Qui', visits: 27, revenue: 3908 },
  { name: 'Sex', visits: 18, revenue: 4800 },
  { name: 'Sáb', visits: 23, revenue: 3800 },
];

export const CASH_FLOW_DATA = [
  { name: 'Semana 1', income: 12000, expense: 5000 },
  { name: 'Semana 2', income: 15500, expense: 4200 },
  { name: 'Semana 3', income: 11000, expense: 8000 },
  { name: 'Semana 4', income: 18000, expense: 4500 },
];

export const MOCK_EXPENSES: Expense[] = [
  { id: 'ex1', description: 'Aluguel da Clínica', amount: 3500, dueDate: '2023-11-05', category: 'Fixed', isRecurring: true, status: 'pending' },
  { id: 'ex2', description: 'Manutenção Equip. Pilates', amount: 450, dueDate: '2023-10-28', category: 'Variable', isRecurring: false, status: 'paid' },
  { id: 'ex3', description: 'Conta de Luz', amount: 620, dueDate: '2023-11-10', category: 'Fixed', isRecurring: true, status: 'pending' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', description: 'Pacote 10 Sessões - Isabella', amount: 1500, type: 'income', category: 'Venda Pacote', date: '2023-10-24', status: 'paid', paymentMethod: 'Pix' },
  { id: 't2', description: 'Sessão Avulsa - Carlos', amount: 180, type: 'income', category: 'Atendimento', date: '2023-10-24', status: 'paid', paymentMethod: 'Debit Card' },
  { id: 't3', description: 'Repasse Amil - Ref Setembro', amount: 2400, type: 'income', category: 'Convênio', date: '2023-10-22', status: 'paid', paymentMethod: 'Convênio' },
];
