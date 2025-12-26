import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { 
  ArrowDownLeft, Clock, CheckCircle2, MoreVertical, 
  Calendar, Search, Filter, AlertCircle 
} from 'lucide-react';

// TIPAGEM & MOCK DATA (Para validar o Layout)
type TransactionStatus = 'paid' | 'pending' | 'overdue';

interface Transaction {
  id: string;
  title: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  status: TransactionStatus;
  paymentMethod: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1', title: 'Lote #8492 - Unimed', description: 'Referente a 12 guias de Dezembro',
    amount: 4250.00, date: '2025-12-20', status: 'paid', paymentMethod: 'Transferência'
  },
  {
    id: '2', title: 'Consulta Particular', description: 'Paciente: João Lucas',
    amount: 350.00, date: '2025-12-20', status: 'paid', paymentMethod: 'PIX'
  },
  {
    id: '3', title: 'Lote #8491 - Bradesco', description: 'Aguardando processamento',
    amount: 1800.00, date: '2025-12-19', status: 'pending', paymentMethod: 'Boleto'
  },
  {
    id: '4', title: 'Consulta Particular', description: 'Paciente: Ana Beatriz',
    amount: 350.00, date: '2025-12-18', status: 'overdue', paymentMethod: 'Cartão Crédito'
  },
];

// Helper para agrupar por data (Estilo WhatsApp)
const groupTransactionsByDate = (transactions: Transaction[]) => {
  const groups: Record<string, Transaction[]> = {};
  transactions.forEach(t => {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])); // Mais recente primeiro
};

const StatusBadge = ({ status }: { status: TransactionStatus }) => {
  const styles = {
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-600 border-amber-100',
    overdue: 'bg-red-50 text-red-600 border-red-100'
  };

  const labels = {
    paid: 'Recebido',
    pending: 'Pendente',
    overdue: 'Atrasado'
  };

  const icons = {
    paid: CheckCircle2,
    pending: Clock,
    overdue: AlertCircle
  };

  const Icon = icons[status];

  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>
      <Icon className="w-3.5 h-3.5" />
      {labels[status]}
    </span>
  );
};

export const FinanceReceivables: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const groupedData = groupTransactionsByDate(MOCK_TRANSACTIONS);

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
      
      {/* 1. BARRA DE FERRAMENTAS */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar lançamentos..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
            <ArrowDownLeft className="w-4 h-4" />
            Nova Receita
          </button>
          <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. TIMELINE VERTICAL */}
      <div className="space-y-8 relative before:absolute before:left-4 sm:before:left-8 before:top-4 before:bottom-0 before:w-px before:bg-gray-200">
        {groupedData.map(([date, transactions]) => (
          <div key={date} className="relative">
            {/* DATA STICKY */}
            <div className="sticky top-20 z-10 mb-4 pl-12 sm:pl-20">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-500 shadow-sm">
                <Calendar className="w-3 h-3" />
                {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                <span className="text-gray-300">|</span>
                <span className="font-normal capitalize">{new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
              </span>
            </div>

            {/* LISTA DE TRANSAÇÕES */}
            <div className="space-y-3 pl-8 sm:pl-16">
              {transactions.map(item => (
                <div 
                  key={item.id}
                  className="group relative bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all cursor-pointer"
                >
                  {/* Bolinha da Timeline */}
                  <div className={`
                    absolute -left-[29px] sm:-left-[33px] top-6 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10
                    ${item.status === 'paid' ? 'bg-emerald-500' : item.status === 'overdue' ? 'bg-red-400' : 'bg-amber-400'}
                  `}></div>

                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-800 truncate">{item.title}</h4>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-sm text-gray-500 truncate">{item.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{item.paymentMethod}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-lg font-bold ${item.status === 'paid' ? 'text-emerald-600' : 'text-gray-700'}`}>
                        {formatCurrency(item.amount)}
                      </p>
                      <button className="p-1 mt-1 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* 3. EMPTY STATE (Caso não tenha dados) */}
      {groupedData.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p>Nenhum lançamento encontrado.</p>
        </div>
      )}
    </div>
  );
};