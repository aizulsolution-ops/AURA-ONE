import React from 'react';
import { PendingBillingItem } from '../../types/finance';
import { formatCurrency, formatDateBr } from '../../utils/formatters';

interface Props {
  item: PendingBillingItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export const BillableItemTicket: React.FC<Props> = ({ item, isSelected, onToggle }) => {
  return (
    <div 
      onClick={() => onToggle(item.item_id)}
      className={`
        flex justify-between items-center p-3 mb-2 rounded-lg border cursor-pointer transition-all
        ${isSelected 
          ? 'bg-blue-50 border-blue-500 shadow-sm' 
          : 'bg-white border-gray-200 hover:border-gray-300'}
      `}
    >
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 font-medium">
          {formatDateBr(item.agenda_date)} • {item.patient_name}
        </span>
        <span className="text-sm font-semibold text-gray-800">
          {item.service_name}
        </span>
      </div>

      <div className="flex flex-col items-end">
        <span className="text-sm font-bold text-slate-700">
          {formatCurrency(item.amount_expected)}
        </span>
        {isSelected && (
          <span className="text-xs text-blue-600 font-bold">Selecionado</span>
        )}
      </div>
    </div>
  );
};