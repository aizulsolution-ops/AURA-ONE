import React, { useState } from 'react';
import { BillingGroup } from '../../types/finance';
import { BillingItemRow } from './BillingItemRow';
import { Wallet, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  group: BillingGroup;
  selectedIds: string[];
  onToggleItem: (itemId: string, groupKey: string) => void;
}

export const PayerGroupCard: React.FC<Props> = ({ group, selectedIds, onToggleItem }) => {
  // Estado local para controlar se o grupo está aberto ou fechado
  const [isExpanded, setIsExpanded] = useState(true);

  // Lógica de Seleção em Massa
  const groupItemIds = group.items.map(i => i.item_id);
  const selectedCount = group.items.filter(i => selectedIds.includes(i.item_id)).length;
  const isAllSelected = selectedCount === group.items.length && group.items.length > 0;
  const hasSomeSelected = selectedCount > 0;

  // Função para Selecionar/Deselecionar Todos
  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita fechar o acordeão ao clicar no checkbox
    
    // Se já selecionou tudo, desmarca tudo. Se não, marca tudo.
    groupItemIds.forEach(id => {
      const isSelected = selectedIds.includes(id);
      if (isAllSelected) {
        // Se tudo tá marcado, quero desmarcar (toggle apenas os que estão on)
        if (isSelected) onToggleItem(id, group.groupKey);
      } else {
        // Se falta algo, quero marcar (toggle apenas os que estão off)
        if (!isSelected) onToggleItem(id, group.groupKey);
      }
    });
  };

  return (
    <div className="mb-6 animate-fade-in-up transition-all duration-300">
      {/* HEADER DO GRUPO (Clicável para Expandir/Recolher) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          sticky top-0 z-10 cursor-pointer backdrop-blur-md transition-all duration-200
          border rounded-xl mb-2 overflow-hidden shadow-sm hover:shadow-md
          ${hasSomeSelected ? 'bg-emerald-50/90 border-emerald-100' : 'bg-white/95 border-gray-200'}
        `}
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Ícone Carteira */}
            <div className={`
              p-2 rounded-lg flex-shrink-0 transition-colors
              ${hasSomeSelected ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-100 text-gray-400'}
            `}>
              <Wallet className="w-5 h-5" />
            </div>

            {/* Títulos */}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 truncate">
                {group.payerName}
                <span className="text-gray-300">•</span>
                <span className="text-gray-500 font-normal truncate">{group.agreementName}</span>
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {hasSomeSelected 
                  ? <span className="text-emerald-600 font-bold">{selectedCount} selecionados</span>
                  : `${group.items.length} guias • ${formatCurrency(group.totalValue)}`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2">
            {/* Botão Select All (Só aparece se expandido) */}
            {isExpanded && (
              <button
                onClick={handleSelectAll}
                className={`p-2 rounded-lg transition-colors mr-1 hover:bg-black/5 ${isAllSelected ? 'text-emerald-600' : 'text-gray-300'}`}
                title="Selecionar Todos"
              >
                {isAllSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </button>
            )}

            {/* Seta do Acordeão */}
            <div className="text-gray-400">
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
          </div>
        </div>
        
        {/* Barra de Progresso Visual (Opcional - Toque Premium) */}
        {hasSomeSelected && (
          <div className="h-1 w-full bg-emerald-100">
            <div 
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(selectedCount / group.items.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* LISTA DE ITENS (Condicional: Só mostra se expandido) */}
      {isExpanded && (
        <div className="pl-2 sm:pl-4 space-y-2 animate-slide-down origin-top">
          {group.items.map(item => (
            <BillingItemRow
              key={item.item_id}
              item={item}
              isSelected={selectedIds.includes(item.item_id)}
              onToggle={() => onToggleItem(item.item_id, group.groupKey)}
            />
          ))}
        </div>
      )}
    </div>
  );
};