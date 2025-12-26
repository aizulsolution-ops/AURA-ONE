/* src/components/agenda/AgendaMacroView.tsx - VERSÃO FINAL (DINÂMICA) */
import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

type ViewMode = 'month' | 'week';

interface Props {
  isOpen: boolean;
  initialMode: ViewMode;
  timeSlots: string[]; // <--- NOVO: Recebe os horários reais da clínica
  onClose: () => void;
  onSelectDate: (date: Date) => void;
}

// Mock de dados para simulação visual de ocupação
const generateOccupancyData = (year: number, month: number) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data: Record<string, { total: number; max: number }> = {};
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const max = 40; 
    const total = Math.floor(Math.random() * (max + 1)); 
    data[dateKey] = { total, max };
  }
  return data;
};

export const AgendaMacroView: React.FC<Props> = ({ isOpen, initialMode, timeSlots, onClose, onSelectDate }) => {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [currentDate, setCurrentDate] = useState(new Date());

  const occupancyData = useMemo(() => 
    generateOccupancyData(currentDate.getFullYear(), currentDate.getMonth()), 
  [currentDate]);

  if (!isOpen) return null;

  // --- HELPERS VISUAIS ---
  const getOccupancyColor = (total: number, max: number) => {
    const ratio = total / max;
    if (ratio >= 0.8) return 'bg-red-50 text-red-600 border-red-200';
    if (ratio >= 0.4) return 'bg-amber-50 text-amber-600 border-amber-200';
    return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  };

  const getStatusLabel = (total: number, max: number) => {
    const ratio = total / max;
    if (ratio >= 0.8) return 'LOTADO';
    if (ratio >= 0.4) return 'MOVIMENTADO';
    return 'TRANQUILO';
  };

  // --- RENDERIZADORES ---

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="grid grid-cols-7 gap-3 h-full overflow-y-auto p-4 custom-scrollbar">
        {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(day => (
          <div key={day} className="text-center text-xs font-bold text-slate-400 py-2">{day}</div>
        ))}
        
        {blanks.map((_, i) => <div key={`blank-${i}`} className="h-24 bg-slate-50/50 rounded-xl" />)}
        
        {days.map(day => {
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const data = occupancyData[dateKey];
          const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;
          const style = getOccupancyColor(data.total, data.max);

          return (
            <button
              key={day}
              onClick={() => onSelectDate(new Date(year, month, day))}
              className={`
                relative h-28 border rounded-xl p-3 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md
                ${isWeekend ? 'bg-slate-50 border-slate-100 opacity-60' : `bg-white ${style}`}
              `}
            >
              <div className="flex justify-between items-start">
                <span className="text-lg font-bold text-slate-700">{day}</span>
                {!isWeekend && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/50 border border-black/5">
                    {getStatusLabel(data.total, data.max)}
                  </span>
                )}
              </div>

              {!isWeekend ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium opacity-80">
                    <span>Ocupação</span>
                    <span>{Math.round((data.total / data.max) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${data.total/data.max > 0.8 ? 'bg-red-500' : data.total/data.max > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${(data.total / data.max) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-right mt-1 font-bold">{data.total}/{data.max} slots</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-300">
                  <Calendar size={24} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    // Agora usamos os timeSlots REAIS passados via prop
    const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header da Tabela */}
        <div className="grid grid-cols-6 gap-px bg-slate-200 border-b border-slate-200 flex-none pr-2">
          <div className="bg-slate-50 p-3 text-center text-xs font-bold text-slate-400 flex items-center justify-center">HORÁRIO</div>
          {weekDays.map(d => (
            <div key={d} className="bg-white p-3 text-center text-sm font-bold text-slate-700 uppercase">{d}</div>
          ))}
        </div>

        {/* Corpo da Tabela */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-6 gap-px bg-slate-100">
            {timeSlots.map(time => (
              <React.Fragment key={time}>
                {/* Coluna de Horário */}
                <div className="bg-slate-50 p-4 flex items-center justify-center text-xs font-bold text-slate-500 border-b border-slate-100">
                  {time}
                </div>
                
                {/* Colunas dos Dias */}
                {weekDays.map((day) => {
                  // Simulação de disponibilidade (0 = Livre, 1 = Ocupado)
                  const isBusy = Math.random() > 0.7; 
                  
                  return (
                    <div 
                      key={`${day}-${time}`} 
                      className={`
                        p-2 min-h-[60px] flex items-center justify-center transition-colors border-b border-white
                        ${isBusy ? 'bg-slate-100' : 'bg-white hover:bg-blue-50 cursor-pointer'}
                      `}
                      onClick={() => !isBusy && onSelectDate(new Date())}
                    >
                      {isBusy ? (
                        <div className="flex flex-col items-center text-slate-300">
                          <AlertCircle size={16} />
                          <span className="text-[10px] font-bold mt-1">OCUPADO</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-emerald-500 opacity-0 hover:opacity-100 transition-opacity">
                          <CheckCircle2 size={20} />
                          <span className="text-[10px] font-bold">LIVRE</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                {mode === 'month' ? <Calendar size={20} /> : <Clock size={20} />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Visão Macro: {mode === 'month' ? 'Mensal' : 'Semanal'}</h2>
                <p className="text-xs text-slate-500">Planejamento Operacional de Ocupação</p>
              </div>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg ml-6">
              <button 
                onClick={() => setMode('week')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all uppercase ${mode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Semana
              </button>
              <button 
                onClick={() => setMode('month')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all uppercase ${mode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Mês
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-white text-slate-500 rounded-l-lg"><ChevronLeft size={16}/></button>
                <span className="px-4 text-sm font-bold text-slate-700 min-w-[120px] text-center">
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-white text-slate-500 rounded-r-lg"><ChevronRight size={16}/></button>
            </div>

            <button onClick={onClose} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* CORPO */}
        <div className="flex-1 overflow-hidden bg-slate-50">
          {mode === 'month' ? renderMonthView() : renderWeekView()}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 bg-white border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500 shrink-0">
            <div className="flex gap-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Baixa Ocupação</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Moderado</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Crítico / Lotado</div>
            </div>
            <div>* Clique em um dia/horário para gerenciar detalhes.</div>
        </div>

      </div>
    </div>
  );
};