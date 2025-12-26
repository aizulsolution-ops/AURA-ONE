import React, { useState } from 'react';
import { FinanceBilling } from './FinanceBilling';
import { FinanceDashboard } from '../components/finance/FinanceDashboard';
import { FinanceReceivables } from '../components/finance/FinanceReceivables'; // <--- IMPORT NOVO
import { useClinicId } from '../hooks/useClinicId';
import { LayoutDashboard, Receipt, Wallet } from 'lucide-react';

type FinanceTab = 'dashboard' | 'billing' | 'receivables';

const Finance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const { clinicId, loading } = useClinicId();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 animate-pulse">Carregando módulo financeiro...</div>
      </div>
    );
  }

  if (!clinicId) {
    return (
      <div className="p-8 text-center bg-red-50 border border-red-200 rounded-lg m-4">
        <h3 className="text-red-700 font-bold text-lg">Acesso Negado</h3>
        <p className="text-red-600 mb-4">Clínica não identificada.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* HEADER E NAVEGAÇÃO DE ABAS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
          <p className="text-gray-500">Gestão de faturamento e fluxo de caixa</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl self-start overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'billing' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Faturamento
          </button>
           <button
            onClick={() => setActiveTab('receivables')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'receivables' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Caixa
          </button>
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO */}
      <div className="min-h-[500px]">
        {activeTab === 'dashboard' && <FinanceDashboard />}
        
        {activeTab === 'billing' && <FinanceBilling clinicId={clinicId} />}
        
        {activeTab === 'receivables' && <FinanceReceivables />} 
      </div>
    </div>
  );
};

export default Finance;