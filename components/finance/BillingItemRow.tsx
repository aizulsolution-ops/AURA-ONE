import React from 'react';
import { PendingBillingItem } from '../../types/finance';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle2, Circle, Calendar, User, Stethoscope } from 'lucide-react';

interface Props {
  item: PendingBillingItem;
  isSelected: boolean;
  onToggle: () => void;
}

export const BillingItemRow: React.FC<Props> = ({ item, isSelected, onToggle }) => {
  return (
    <div 
      onClick={onToggle}
      className={`
        group relative flex items-center gap-4 p-4 mb-3 rounded-xl border transition-all duration-200 cursor-pointer
        ${isSelected 
          ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' 
          : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'
        }
      `}
    >
      {/* 1. CHECKBOX CUSTOMIZADO */}
      <div className={`
        flex-shrink-0 transition-colors duration-200
        ${isSelected ? 'text-emerald-500' : 'text-gray-300 group-hover:text-gray-400'}
      `}>
        {isSelected ? (
          <CheckCircle2 className="w-6 h-6 fill-emerald-100" />
        ) : (
          <Circle className="w-6 h-6" />
        )}
      </div>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h4 className={`text-sm font-bold truncate pr-2 ${isSelected ? 'text-emerald-900' : 'text-gray-800'}`}>
            {item.patient_name}
          </h4>
          <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 whitespace-nowrap">
            {new Date(item.agenda_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Stethoscope className="w-3 h-3 text-gray-400" />
            <span className="truncate max-w-[150px]">{item.service_name}</span>
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300"></div>
          <div className="flex items-center gap-1">
             <User className="w-3 h-3 text-gray-400" />
             <span className="truncate">{item.payer_name}</span>
          </div>
        </div>
      </div>

      {/* 3. VALOR (Destaque Premium) */}
      <div className="text-right pl-2 border-l border-gray-100 ml-2">
        <p className={`text-sm font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>
          {formatCurrency(item.amount_expected)}
        </p>
      </div>
    </div>
  );
};