/* src/views/Admin.tsx - VERSÃO 3.0 (INTEGRAÇÃO COM PROFESSIONAL WIZARD) */
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase'; 
import { 
    Users, Plus, Settings, CheckCircle2, 
    User, BadgeCheck, Stethoscope, Building2,
    Clock, Utensils, Hourglass, Save, BarChart3, Minus, Plus as PlusIcon, Info, Edit3, Star
} from 'lucide-react';
import { ProfessionalWizard } from '../components/admin/ProfessionalWizard'; // IMPORTAÇÃO

// --- TIPOS ---
interface AdminUser {
    id: string;
    name: string;
    email?: string; 
    role: string;
    avatar_url?: string | null;
    registry?: string | null;
    display_specialties?: string[];
    phone?: string;
    cpf?: string;
    birth_date?: string;
}

interface Specialty {
    id: string; 
    specialty_id: string;
    name: string; 
    custom_name?: string; 
    capacidade: number; 
    is_favorite: boolean; 
}

interface ClinicSettings {
    opens_at: string;
    closes_at: string;
    lunch_start: string;
    lunch_end: string;
    slot_duration: number;
}

const getRoleStyle = (role: string) => {
    switch (role) {
        case 'admin':
        case 'manager':
            return { border: 'border-l-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-100', label: 'Gestão' };
        case 'receptionist':
            return { border: 'border-l-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Recepção' };
        default: 
            return { border: 'border-l-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Saúde' };
    }
};

const Admin: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'team' | 'settings'>('team');
    const [loading, setLoading] = useState(true);
    const [currentClinicId, setCurrentClinicId] = useState<string | null>(null);

    // Team State
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [catalogSpecialties, setCatalogSpecialties] = useState<{id: string, name: string}[]>([]); 
    
    // WIZARD STATE
    const [showWizard, setShowWizard] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

    // Settings State
    const [clinicSpecialties, setClinicSpecialties] = useState<Specialty[]>([]);
    const [settings, setSettings] = useState<ClinicSettings>({
        opens_at: '07:00', closes_at: '19:00', lunch_start: '12:00', lunch_end: '14:00', slot_duration: 40
    });
    const [settingsStatus, setSettingsStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [capacityStatus, setCapacityStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('id', session.user.id).single();
                if (profile?.clinic_id) {
                    setCurrentClinicId(profile.clinic_id);
                    fetchData(profile.clinic_id);
                }
            }
        };
        init();
    }, []);

    const fetchData = async (clinicId: string) => {
        setLoading(true);
        try {
            // Equipe
            const { data: usersData } = await supabase.from('profiles').select('*').eq('clinic_id', clinicId).order('name');
            const { data: userSpecsData } = await supabase.from('professional_specialties').select('professional_id, specialties(name)').eq('is_active', true);
            
            const processedUsers = (usersData || []).map((user: any) => {
                const mySpecs = userSpecsData?.filter((us: any) => us.professional_id === user.id).map((us: any) => us.specialties?.name).filter(Boolean); 
                return { ...user, display_specialties: mySpecs || [] };
            });
            setUsers(processedUsers);

            // Catálogo Global (Para seleção)
            const { data: catalogData } = await supabase.from('specialties').select('id, name').order('name');
            if (catalogData) setCatalogSpecialties(catalogData);

            // Configurações da Clínica
            const { data: clinicSpecsData } = await supabase
                .from('clinic_specialties')
                .select(`id, capacidade, custom_name, specialty_id, is_favorite, specialties ( name )`)
                .eq('clinic_id', clinicId);
            
            if (clinicSpecsData) {
                const formattedSpecs: Specialty[] = clinicSpecsData.map((item: any) => ({
                    id: item.id,
                    specialty_id: item.specialty_id,
                    name: item.specialties?.name || 'Sem Nome',
                    custom_name: item.custom_name || '', 
                    capacidade: item.capacidade ?? 1,
                    is_favorite: item.is_favorite ?? false
                }));
                formattedSpecs.sort((a, b) => a.name.localeCompare(b.name));
                setClinicSpecialties(formattedSpecs);
            }

            const { data: clinicData } = await supabase.from('clinics').select('settings').eq('id', clinicId).single();
            if (clinicData?.settings) setSettings({ ...settings, ...clinicData.settings });

        } catch (error) { console.error('Erro:', error); } finally { setLoading(false); }
    };

    const handleSaveSettings = async () => {
        if (!currentClinicId) return;
        setSettingsStatus('saving');
        try {
            await supabase.from('clinics').update({ settings: settings }).eq('id', currentClinicId);
            setSettingsStatus('success'); setTimeout(() => setSettingsStatus('idle'), 2500);
        } catch (err) { setSettingsStatus('error'); }
    };

    const handleUpdateCapacity = (id: string, delta: number) => {
        setClinicSpecialties(prev => prev.map(s => s.id === id ? { ...s, capacidade: Math.max(0, (s.capacidade || 0) + delta) } : s));
    };

    const handleUpdateCustomName = (id: string, val: string) => {
        setClinicSpecialties(prev => prev.map(s => s.id === id ? { ...s, custom_name: val } : s));
    };

    const handleToggleFavorite = (id: string) => {
        const currentFavoritesCount = clinicSpecialties.filter(s => s.is_favorite).length;
        const targetSpec = clinicSpecialties.find(s => s.id === id);
        if (!targetSpec?.is_favorite && currentFavoritesCount >= 4) return alert("Limite atingido: Máximo 04 favoritos.");
        setClinicSpecialties(prev => prev.map(s => s.id === id ? { ...s, is_favorite: !s.is_favorite } : s));
    };

    const handleSaveCapacities = async () => {
        if (!currentClinicId) return;
        setCapacityStatus('saving');
        try {
            const promises = clinicSpecialties.map(s => 
                supabase.from('clinic_specialties').update({ capacidade: s.capacidade, custom_name: s.custom_name, is_favorite: s.is_favorite }).eq('id', s.id)
            );
            await Promise.all(promises);
            setCapacityStatus('success'); setTimeout(() => setCapacityStatus('idle'), 2500);
        } catch (err) { setCapacityStatus('error'); }
    };

    const handleOpenEdit = (user: AdminUser) => { setEditingUser(user); setShowWizard(true); };
    const handleOpenNew = () => { setEditingUser(null); setShowWizard(true); };

    const UserCard = ({ u }: { u: AdminUser }) => {
        const style = getRoleStyle(u.role);
        return (
            <div onClick={() => handleOpenEdit(u)} className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex overflow-hidden group relative border-l-[6px] cursor-pointer ${style.border}`}>
                <div className="w-24 bg-slate-50 flex items-center justify-center shrink-0 border-r border-slate-100 relative">
                    {u.avatar_url ? <img src={u.avatar_url} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" alt={u.name}/> : <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-slate-300"><User size={24}/></div>}
                </div>
                <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${style.badge}`}>{style.label}</div>
                        {u.registry && (
                            <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1">
                                <BadgeCheck size={10}/> {u.registry}
                            </div>
                        )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 truncate uppercase leading-tight" title={u.name}>{u.name}</h3>
                    <div className="mt-2 min-h-[20px]">
                        {u.display_specialties && u.display_specialties.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {u.display_specialties.slice(0, 2).map((spec, i) => (
                                    <span key={i} className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium uppercase truncate max-w-[100px]">{spec}</span>
                                ))}
                                {u.display_specialties.length > 2 && (
                                    <span className="text-[9px] text-slate-400 font-bold px-1 py-0.5">+ {u.display_specialties.length - 2}</span>
                                )}
                            </div>
                        ) : (
                            <p className="text-[10px] text-slate-300 italic font-medium">
                                {u.role === 'therapist' ? 'Sem especialidades' : 'Acesso Administrativo'}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const managementUsers = users.filter(u => ['admin', 'manager', 'receptionist'].includes(u.role));
    const healthUsers = users.filter(u => u.role === 'therapist');

    return (
        <div className="space-y-6 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight uppercase">Administração</h2>
                    <p className="text-slate-500 mt-1 text-sm font-medium">Controle total da clínica.</p>
                </div>
                <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button onClick={() => setActiveTab('team')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'team' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        Equipe
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Settings size={14}/> Configurações
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div></div>
            ) : (
                <>
                    {activeTab === 'team' && (
                        <div className="space-y-10">
                            <div className="flex justify-end">
                                <button onClick={handleOpenNew} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2 uppercase text-xs tracking-wider transition-all">
                                    <Plus size={18}/> Novo Membro
                                </button>
                            </div>

                            {managementUsers.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Building2 className="text-purple-600" size={20}/>
                                        <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide">Administração & Recepção</h3>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{managementUsers.length}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                        {managementUsers.map(u => <UserCard key={u.id} u={u} />)}
                                    </div>
                                </div>
                            )}

                            {(managementUsers.length > 0 && healthUsers.length > 0) && <div className="border-t border-slate-100"></div>}

                            {healthUsers.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Stethoscope className="text-emerald-600" size={20}/>
                                        <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide">Corpo Clínico</h3>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{healthUsers.length}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                        {healthUsers.map(u => <UserCard key={u.id} u={u} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            {/* ... (Blocos de Configuração mantidos intactos) ... */}
                            {/* Bloco 1: Horários */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                                <div className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Settings className="text-blue-600"/> Regras de Funcionamento</h3>
                                    <p className="text-sm text-slate-500 mt-1">Defina os horários padrão da agenda.</p>
                                </div>
                                <div className="flex-1 p-8 space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-3 flex items-center gap-2"><Clock size={14}/> Horário de Atendimento</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Abertura</label>
                                                <input type="time" className="w-full p-3 border rounded-xl font-bold text-slate-700" value={settings.opens_at} onChange={e => setSettings({...settings, opens_at: e.target.value})}/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fechamento</label>
                                                <input type="time" className="w-full p-3 border rounded-xl font-bold text-slate-700" value={settings.closes_at} onChange={e => setSettings({...settings, closes_at: e.target.value})}/>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-3 flex items-center gap-2"><Utensils size={14}/> Intervalo de Almoço</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Início</label>
                                                <input type="time" className="w-full p-3 border rounded-xl font-bold text-slate-700" value={settings.lunch_start} onChange={e => setSettings({...settings, lunch_start: e.target.value})}/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fim</label>
                                                <input type="time" className="w-full p-3 border rounded-xl font-bold text-slate-700" value={settings.lunch_end} onChange={e => setSettings({...settings, lunch_end: e.target.value})}/>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-3 flex items-center gap-2"><Hourglass size={14}/> Duração da Sessão</label>
                                        <select className="w-full p-3 border rounded-xl font-bold text-slate-700 bg-white" value={settings.slot_duration} onChange={e => setSettings({...settings, slot_duration: parseInt(e.target.value)})}>
                                            <option value={20}>20 minutos</option>
                                            <option value={30}>30 minutos</option>
                                            <option value={40}>40 minutos</option>
                                            <option value={50}>50 minutos</option>
                                            <option value={60}>60 minutos</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex justify-end items-center gap-4 mt-auto">
                                    {settingsStatus === 'success' && <span className="text-emerald-600 font-bold text-sm flex items-center gap-1"><CheckCircle2 size={16}/> Salvo!</span>}
                                    {settingsStatus === 'error' && <span className="text-red-500 font-bold text-sm">Erro ao salvar.</span>}
                                    <button onClick={handleSaveSettings} disabled={settingsStatus === 'saving'} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
                                        {settingsStatus === 'saving' ? 'Salvando...' : <><Save size={18}/> Salvar Regras</>}
                                    </button>
                                </div>
                            </div>

                            {/* Bloco 2: Capacidade e Nomes */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                                <div className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><BarChart3 className="text-blue-600"/> Capacidade e Nomes</h3>
                                    <p className="text-sm text-slate-500 mt-1">Personalize como as especialidades aparecem na agenda.</p>
                                </div>
                                <div className="px-6 pt-4">
                                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex gap-3">
                                        <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                                        <p className="text-xs text-blue-700 leading-relaxed">
                                            Defina um <strong>Apelido</strong> para facilitar a leitura. Marque com a <strong>Estrela</strong> (máx. 04) para fixar no topo da Agenda.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                    <div className="space-y-4">
                                        {clinicSpecialties.length === 0 ? (
                                            <p className="text-center text-slate-400 py-10 text-sm">Nenhuma especialidade vinculada.</p>
                                        ) : (
                                            clinicSpecialties.map(spec => {
                                                const isSuspended = spec.capacidade === 0;
                                                return (
                                                    <div key={spec.id} className={`p-4 border rounded-2xl transition-all shadow-sm ${isSuspended ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex-1 min-w-0 pr-4">
                                                                <div className="flex items-center gap-2">
                                                                    <button 
                                                                        onClick={() => handleToggleFavorite(spec.id)}
                                                                        className={`transition-all duration-200 ${spec.is_favorite ? 'text-amber-500 scale-110' : 'text-slate-200 hover:text-amber-200'}`}
                                                                    >
                                                                        <Star size={20} fill={spec.is_favorite ? "currentColor" : "none"} />
                                                                    </button>
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Nome Original</p>
                                                                        <span className={`text-xs font-medium truncate leading-tight block ${isSuspended ? 'text-slate-400' : 'text-slate-600'}`}>{spec.name}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm shrink-0">
                                                                <button onClick={() => handleUpdateCapacity(spec.id, -1)} className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${isSuspended ? 'text-slate-300 cursor-not-allowed' : 'bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500'}`}><Minus size={14}/></button>
                                                                <div className={`w-6 text-center font-bold text-sm ${isSuspended ? 'text-slate-400' : 'text-slate-800'}`}>{spec.capacidade}</div>
                                                                <button onClick={() => handleUpdateCapacity(spec.id, 1)} className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded-md transition-colors"><PlusIcon size={14}/></button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><Edit3 size={10}/> Apelido (Exibição na Agenda)</label>
                                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none uppercase placeholder:font-normal placeholder:normal-case transition-all" placeholder={`Ex: ${spec.name.substring(0, 10).toUpperCase()}`} value={spec.custom_name || ''} onChange={(e) => handleUpdateCustomName(spec.id, e.target.value.toUpperCase())} />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                                <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex justify-end items-center gap-4 mt-auto">
                                    {capacityStatus === 'success' && <span className="text-emerald-600 font-bold text-sm flex items-center gap-1"><CheckCircle2 size={16}/> Salvo!</span>}
                                    {capacityStatus === 'error' && <span className="text-red-500 font-bold text-sm">Erro.</span>}
                                    <button onClick={handleSaveCapacities} disabled={capacityStatus === 'saving'} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
                                        {capacityStatus === 'saving' ? '...' : <><Save size={18}/> Salvar Alterações</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
            
            {/* NOVO MODAL WIZARD */}
            {currentClinicId && (
                <ProfessionalWizard 
                    isOpen={showWizard}
                    onClose={() => setShowWizard(false)}
                    onSuccess={() => { setShowWizard(false); fetchData(currentClinicId); }}
                    clinicId={currentClinicId}
                    specialtiesCatalog={catalogSpecialties}
                    userToEdit={editingUser}
                />
            )}
        </div>
    );
};

export default Admin;