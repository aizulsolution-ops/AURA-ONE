import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar, ArrowRight, Activity } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

// DADOS MOCK (Para visualização do Layout)
const CHART_DATA = [
  { name: 'Jul', faturado: 12500, pendente: 4000 },
  { name: 'Ago', faturado: 15000, pendente: 3500 },
  { name: 'Set', faturado: 18000, pendente: 2000 },
  { name: 'Out', faturado: 16500, pendente: 5500 },
  { name: 'Nov', faturado: 21000, pendente: 3000 },
  { name: 'Dez', faturado: 24500, pendente: 1200 },
];

const KPI_DATA = [
  { 
    title: 'Faturamento Mês', 
    value: 24500, 
    trend: '+12%', 
    isPositive: true,
    icon: Activity,
    color: 'emerald'
  },
  { 
    title: 'A Receber (Pendente)', 
    value: 5200, 
    trend: '-5%', 
    isPositive: true, // Menos pendencia é positivo financeiramente
    icon: Calendar,
    color: 'amber'
  },
  { 
    title: 'Ticket Médio', 
    value: 450, 
    trend: '+2.4%', 
    isPositive: true,
    icon: DollarSign,
    color: 'blue'
  },
];

export const FinanceDashboard: React.FC = () => {
  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      
      {/* 1. HEADER DE CONTROLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Visão Geral</h2>
          <p className="text-sm text-gray-500">Acompanhe a saúde financeira da clínica em tempo real.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer hover:border-emerald-300 transition-colors">
            <option>Últimos 6 meses</option>
            <option>Este Ano</option>
          </select>
        </div>
      </div>

      {/* 2. CARDS DE KPI (Indicadores) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {KPI_DATA.map((kpi, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-${kpi.color}-50 text-${kpi.color}-600 group-hover:scale-110 transition-transform`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${kpi.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {kpi.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.trend}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{kpi.title}</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(kpi.value)}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* 3. GRÁFICO PRINCIPAL & WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO DE ÁREA (2/3 da tela) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-gray-800 mb-6">Evolução do Faturamento</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9ca3af', fontSize: 12}} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9ca3af', fontSize: 12}} 
                  tickFormatter={(val) => `R$${val/1000}k`} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                  labelStyle={{ color: '#6b7280', marginBottom: '0.5rem' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="faturado" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorFat)" 
                  name="Faturado"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WIDGET LATERAL (1/3 da tela) - "Dark Mode" Card */}
        <div className="bg-emerald-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[300px]">
          {/* Efeito Glow no fundo */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-700 rounded-full opacity-50 blur-3xl"></div>
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Relatório Mensal</h3>
            <p className="text-emerald-100 text-sm mb-6 leading-relaxed">
              O desempenho de Dezembro está <span className="font-bold text-white bg-emerald-800 px-2 py-0.5 rounded">12% acima</span> da média projetada.
            </p>
          </div>

          <div className="space-y-3 relative z-10">
            <button className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white py-3 px-4 rounded-xl flex items-center justify-between transition-all group">
              <span className="text-sm font-medium">Baixar Relatório PDF</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
             <button className="w-full bg-white text-emerald-900 py-3 px-4 rounded-xl flex items-center justify-between font-bold hover:bg-gray-100 transition-all shadow-lg active:scale-95">
              <span className="text-sm">Configurar Metas</span>
              <Activity className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};