import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { CHART_DATA } from '../constants';
import { Download, AlertTriangle } from 'lucide-react';

const Reports: React.FC = () => {
  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Relatórios Gerenciais</h2>
        <button className="flex items-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden md:inline">Exportar PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6">Faturamento Semanal</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={CHART_DATA}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="url(#colorRevenue)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Productivity Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6">Atendimentos por Dia</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={CHART_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="visits" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
      
      <div className="bg-white md:p-6 p-4 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-rose-500" />
              Análise de Risco de Retenção
          </h3>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b border-slate-100">
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Nome do Paciente</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Última Visita</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Nível de Risco</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr className="hover:bg-slate-50">
                          <td className="p-4 text-sm font-medium text-slate-800">Isabella Ross</td>
                          <td className="p-4 text-sm text-slate-500">15/10/2023</td>
                          <td className="p-4"><span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">Baixo</span></td>
                          <td className="p-4 text-sm text-slate-500">Ativo</td>
                      </tr>
                       <tr className="hover:bg-slate-50">
                          <td className="p-4 text-sm font-medium text-slate-800">Mariana Silva</td>
                          <td className="p-4 text-sm text-slate-500">20/09/2023</td>
                          <td className="p-4"><span className="px-2 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold">Alto</span></td>
                          <td className="p-4 text-sm text-slate-500">Em Risco (60 dias ausente)</td>
                      </tr>
                  </tbody>
              </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
               <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                   <div className="flex justify-between items-start mb-2">
                       <div>
                           <h4 className="font-bold text-slate-800">Mariana Silva</h4>
                           <p className="text-xs text-slate-500">Última visita: 20/09/2023</p>
                       </div>
                       <span className="px-2 py-1 rounded-full bg-red-100 text-red-600 text-[10px] font-bold uppercase">Alto Risco</span>
                   </div>
                   <p className="text-xs text-slate-600 mt-2 font-medium">Motivo: 60 dias ausente</p>
               </div>
               
               <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                   <div className="flex justify-between items-start mb-2">
                       <div>
                           <h4 className="font-bold text-slate-800">Isabella Ross</h4>
                           <p className="text-xs text-slate-500">Última visita: 15/10/2023</p>
                       </div>
                       <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold uppercase">Baixo Risco</span>
                   </div>
                   <p className="text-xs text-slate-600 mt-2 font-medium">Status: Ativo</p>
               </div>
          </div>
      </div>
    </div>
  );
};

export default Reports;