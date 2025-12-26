import React from 'react';
import { ViewState, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
    CalendarCheck, 
    AlertTriangle, 
    TrendingUp, 
    Users,
    MoreHorizontal,
    Sparkles,
    Zap,
    MessageCircle,
    Calendar,
    ArrowRight,
    UserCircle
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { CHART_DATA, MOCK_APPOINTMENTS } from '../constants';

interface DashboardProps {
    onNavigate: (view: ViewState) => void;
    role: UserRole;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, role }) => {
    // Agora trazemos também a ESPECIALIDADE (userSpecialty)
    const { userName, userAvatar, userSpecialty } = useAuth();

    const getRoleLabel = (r: UserRole) => {
        switch(r) {
            case UserRole.MANAGER: return 'Gestão Executiva';
            case UserRole.PROFESSIONAL: return 'Área Clínica';
            case UserRole.RECEPTION: return 'Recepção';
            default: return 'Visitante';
        }
    };

    // Lógica Inteligente de Exibição: 
    // Se tiver especialidade (Ex: Fisioterapeuta), mostra ela. 
    // Senão, mostra o cargo genérico (Ex: Área Clínica).
    const displayLabel = userSpecialty || getRoleLabel(role);

    const StatCard = ({ title, value, sub, icon: Icon, color, trend }: any) => (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
                    <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
                </div>
                <button className="text-slate-300 hover:text-slate-600">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-1">{value}</h3>
            <p className="text-sm text-slate-500 font-medium">{title}</p>
            {sub && (
                 <p className={`text-xs mt-2 ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'} flex items-center`}>
                    <TrendingUp className={`w-3 h-3 mr-1 ${trend === 'down' ? 'transform rotate-180' : ''}`} />
                    {sub}
                </p>
            )}
        </div>
    );

    const ActionCard = ({ icon: Icon, title, desc, actionLabel, colorClass }: any) => (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-aura-200 hover:bg-white transition-all group cursor-pointer">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-700 group-hover:text-aura-700 transition-colors">{title}</h4>
                    <p className="text-xs text-slate-500">{desc}</p>
                </div>
            </div>
            <button className="text-slate-400 group-hover:text-aura-600">
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header Personalizado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {/* FOTO DO PERFIL */}
                    <div className="w-16 h-16 rounded-full border-4 border-white shadow-sm overflow-hidden bg-slate-100 flex items-center justify-center">
                        {userAvatar ? (
                            <img src={userAvatar} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                            <UserCircle className="w-10 h-10 text-slate-300" />
                        )}
                    </div>
                    
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold text-slate-800">Olá, {userName || 'Doutor(a)'}</h2>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${role === UserRole.MANAGER ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {displayLabel}
                            </span>
                        </div>
                        <p className="text-slate-500">Bem-vindo(a) de volta ao Aura One.</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => onNavigate(ViewState.AGENDA)}
                        className="bg-aura-600 hover:bg-aura-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-aura-500/20 transition-all active:scale-95 flex items-center"
                    >
                        <Calendar className="w-4 h-4 mr-2" />
                        Novo Agendamento
                    </button>
                </div>
            </div>

            {/* AI Insight Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
                 <div className="relative z-10 flex items-start gap-4">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                        <Sparkles className="w-6 h-6 text-yellow-300" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-1">Insight Diário Aura AI</h3>
                        <p className="text-indigo-100 text-sm leading-relaxed max-w-2xl">
                           Reduza 12% de faltas: envie lembretes proativos e personalizados (SMS/WhatsApp) para a próxima semana, aumentando a adesão ao tratamento.
                        </p>
                    </div>
                 </div>
                 <div className="absolute right-0 bottom-0 opacity-10">
                    <Sparkles className="w-48 h-48" />
                 </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Ocupação em Tempo Real" value="82%" sub="+5% vs média" icon={Users} color="text-blue-600 bg-blue-600" trend="up"/>
                <StatCard title="Faltas Previstas (IA)" value="3" sub="Ação necessária" icon={AlertTriangle} color="text-amber-500 bg-amber-500" trend="down"/>
                <StatCard title="Pacientes em Risco" value="12" sub="Prob. Alta de Churn" icon={TrendingUp} color="text-rose-600 bg-rose-600" trend="down"/>
                <StatCard title="Confirmados Hoje" value="28/35" sub="90% Concluído" icon={CalendarCheck} color="text-emerald-500 bg-emerald-500" trend="up"/>
            </div>

            {/* Gráficos e Ações */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800">Fluxo Semanal de Ocupação</h3>
                            <select className="text-sm bg-slate-50 border-none rounded-lg text-slate-500 focus:ring-0"><option>Esta Semana</option></select>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={CHART_DATA}>
                                    <defs>
                                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                                    <Area type="monotone" dataKey="visits" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit sticky top-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <h3 className="font-bold text-slate-800">Ações Diretas</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-lg shadow-indigo-200">
                             <div className="flex justify-between items-start mb-2"><Sparkles className="w-5 h-5 text-yellow-300" /><span className="bg-white/20 text-[10px] px-2 py-1 rounded">Auto</span></div>
                             <h4 className="font-bold text-lg">Encaixe Inteligente</h4>
                             <p className="text-indigo-100 text-xs mt-1 mb-3">IA encontrou 3 lacunas na agenda de hoje.</p>
                             <button className="w-full py-2 bg-white text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-50 transition-colors">Revisar Sugestões</button>
                        </div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2">Ações Manuais</h4>
                        <ActionCard icon={MessageCircle} title="Confirmações" desc="5 pendentes para amanhã" colorClass="bg-green-100 text-green-600" />
                        <ActionCard icon={Users} title="Re-Engajamento" desc="12 pacientes em risco" colorClass="bg-rose-100 text-rose-600" />
                        <ActionCard icon={CalendarCheck} title="Lista de Espera" desc="8 pacientes aguardando" colorClass="bg-blue-100 text-blue-600" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;