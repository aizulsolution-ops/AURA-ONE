import React, { useEffect, useState, useMemo } from 'react';
import { financeService } from '../services/financeService';
import { PendingBillingItem, BillingGroup } from '../types/finance';
import { PayerGroupCard } from '../components/finance/PayerGroupCard';
import { formatCurrency } from '../utils/formatters';
import { RefreshCcw, Check, AlertCircle, FileText } from 'lucide-react';

interface Props {
  clinicId: string;
}

// Pequeno componente local para Toast (Pode ser extraído depois)
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => (
  <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl animate-slide-in-right border ${
    type === 'success' ? 'bg-white border-emerald-100' : 'bg-white border-red-100'
  }`}>
    <div className={`p-1 rounded-full ${type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
      {type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
    </div>
    <div>
      <p className={`text-sm font-bold ${type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
        {type === 'success' ? 'Sucesso' : 'Atenção'}
      </p>
      <p className="text-xs text-gray-500">{message}</p>
    </div>
    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4">✕</button>
  </div>
);

export const FinanceBilling: React.FC<Props> = ({ clinicId }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingBillingItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await financeService.getPendingItems(clinicId);
      setItems(data);
      setSelectedIds([]); 
      setActiveGroupKey(null);
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar com o servidor.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (clinicId) loadData(); }, [clinicId]);

  const groupedData = useMemo(() => {
    const groups: Record<string, BillingGroup> = {};
    items.forEach(item => {
      const key = `${item.payer_id}::${item.agreement_id || 'null'}`;
      if (!groups[key]) {
        groups[key] = {
          groupKey: key,
          payerId: item.payer_id,
          agreementId: item.agreement_id,
          payerName: item.payer_name,
          agreementName: item.agreement_name || 'Particular / Padrão',
          totalValue: 0,
          items: []
        };
      }
      groups[key].items.push(item);
      groups[key].totalValue += item.amount_expected;
    });
    return Object.values(groups);
  }, [items]);

  const handleToggleItem = (itemId: string, groupKey: string) => {
    if (activeGroupKey && activeGroupKey !== groupKey && selectedIds.length > 0) {
      setSelectedIds([itemId]); 
      setActiveGroupKey(groupKey);
      return;
    }
    let newSelected = [...selectedIds];
    if (newSelected.includes(itemId)) newSelected = newSelected.filter(id => id !== itemId);
    else newSelected.push(itemId);
    setSelectedIds(newSelected);
    if (newSelected.length === 0) setActiveGroupKey(null);
    else setActiveGroupKey(groupKey);
  };

  const handleCreateBatch = async () => {
    if (!activeGroupKey || selectedIds.length === 0) return;
    const group = groupedData.find(g => g.groupKey === activeGroupKey);
    if (!group) return;

    try {
      await financeService.createBatch({
        clinicId: clinicId,
        payerId: group.payerId,
        agreementId: group.agreementId,
        itemIds: selectedIds
      });
      showToast(`Lote gerado com ${selectedIds.length} guias!`, "success");
      loadData(); 
    } catch (err: any) {
      if (err?.code === '22P02' || err?.message?.includes('billing_item_status')) {
        showToast("Erro de Configuração (Enum) no Backend", "error");
      } else {
        showToast("Não foi possível gerar o lote. Tente novamente.", "error");
      }
    }
  };

  const selectedTotal = items
    .filter(i => selectedIds.includes(i.item_id))
    .reduce((acc, curr) => acc + curr.amount_expected, 0);

  return (
    <div className="relative min-h-screen bg-gray-50 pb-32">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <header className="px-4 pt-6 pb-4 bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
             <h2 className="text-xl font-bold text-gray-800 tracking-tight">Faturamento</h2>
             <p className="text-xs text-gray-500 font-medium">Itens aguardando processamento</p>
          </div>
          <button onClick={loadData} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all" title="Atualizar">
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {loading ? (
          // SKELETON LOADING (Visual Premium)
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="space-y-3">
                <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse mb-4"></div>
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-20 w-full bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse"></div>
                ))}
              </div>
            ))}
          </div>
        ) : groupedData.length === 0 ? (
          // EMPTY STATE ILUSTRADO
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-white p-6 rounded-full shadow-sm mb-6">
              <FileText className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Tudo limpo por aqui!</h3>
            <p className="text-gray-500 max-w-xs mx-auto text-sm">
              Não há atendimentos pendentes de faturamento no momento.
            </p>
          </div>
        ) : (
          groupedData.map(group => (
            <PayerGroupCard
              key={group.groupKey}
              group={group}
              selectedIds={selectedIds}
              onToggleItem={handleToggleItem}
            />
          ))
        )}
      </div>

      {/* BARRA DE AÇÃO FIXA (Estilo Mobile App) */}
      <div className={`
        fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-4 transition-transform duration-300 z-50
        ${selectedIds.length > 0 ? 'translate-y-0' : 'translate-y-full'}
      `}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Selecionados</p>
            <p className="text-lg font-bold text-gray-800">
              {selectedIds.length} <span className="text-sm font-normal text-gray-400">itens</span>
            </p>
          </div>

          <div className="flex-1 flex items-center justify-end gap-4">
            <div className="text-right mr-2">
              <p className="text-xs text-gray-500">Valor Total</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(selectedTotal)}</p>
            </div>
            
            <button
              onClick={handleCreateBatch}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>Gerar Lote</span>
              <Check className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};