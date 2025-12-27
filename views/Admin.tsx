/* src/views/Admin.tsx - VERSÃO 7.0 (CORREÇÃO VISUAL DA ABA CONFIGURAÇÕES) */
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase'; 
import { 
    Users, Plus, Settings, CheckCircle2, 
    User, BadgeCheck, Stethoscope, Building2,
    Clock, Utensils, Hourglass, Save, BarChart3, Minus, Plus as PlusIcon, 
    Info, Edit3, Star, Palette, ImageIcon, MapPin, Phone, FileText,
    Search, RotateCcw, Loader2, X
} from 'lucide-react';
import { ProfessionalWizard } from '../components/admin/ProfessionalWizard'; 

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
    // Operacional
    opens_at: string;
    closes_at: string;
    lunch_start: string;
    lunch_end: string;
    slot_duration: number;
    
    // Branding
    branding?: {
        colors?: { primary: string; secondary: string; };
        logos?: { full_horizontal: string | null; full_vertical: string | null; icon: string | null; };
    };

    // Institucional
    institutional?: {
        cnpj: string;
        cep?: string; 
        address: string;
        number?: string; 
        complement?: string; 
        neighborhood?: string; 
        city?: string; 
        state?: string; 
        phone: string;
    };
}

const getRoleStyle = (role: string) => {
    switch (role) {
        case 'admin':
        case 'manager': return { border: 'border-l-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-100', label: 'Gestão' };
        case 'receptionist': return { border: 'border-l-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Recepção' };
        default: return { border: 'border-l-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Saúde' };
    }
};

// --- MÁSCARAS ---
const formatCNPJ = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 18);
const formatPhone = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 15);
const formatCEP = (v: string) => v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);

// --- SKELETON LOADER ---
const AdminSkeleton = () => (
    <div className="space-y-8 animate-pulse max-w-7xl mx-auto px-4 md:px-0">
        <div className="flex justify-between items-end border-b border-slate-100 pb-6">
            <div className="space-y-2"><div className="h-8 w-48 bg-slate-200 rounded-lg"></div><div className="h-4 w-64 bg-slate-100 rounded-lg"></div></div>
            <div className="h-10 w-72 bg-slate-200 rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl border border-slate-200"></div>)}
        </div>
    </div>
);

const Admin: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'team' | 'settings' | 'branding'>('team');
    const [loading, setLoading] = useState(true);
    const [currentClinicId, setCurrentClinicId] = useState<string | null>(null);

    // Dados
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [catalogSpecialties, setCatalogSpecialties] = useState<{id: string, name: string}[]>([]); 
    const [clinicSpecialties, setClinicSpecialties] = useState<Specialty[]>([]);
    
    // UI States
    const [showWizard, setShowWizard] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    
    // Estados Identidade
    const [isEditingVisual, setIsEditingVisual] = useState(false);
    const [isEditingData, setIsEditingData] = useState(false);
    const [loadingAddress, setLoadingAddress] = useState(false);
    const numberInputRef = useRef<HTMLInputElement>(null);

    const [settings, setSettings] = useState<ClinicSettings>({
        opens_at: '07:00', closes_at: '19:00', lunch_start: '12:00', lunch_end: '14:00', slot_duration: 40,
        branding: { colors: { primary: '#2563eb', secondary: '#ffffff' }, logos: { full_horizontal: null, full_vertical: null, icon: null } },
        institutional: { cnpj: '', cep: '', address: '', number: '', complement: '', neighborhood: '', city: '', state: '', phone: '' }
    });
    
    // Status Feedbacks
    const [settingsStatus, setSettingsStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [capacityStatus, setCapacityStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [brandingStatus, setBrandingStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [dataStatus, setDataStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle'); 
    const [uploadingField, setUploadingField] = useState<string | null>(null);

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

            // Dados Gerais
            const { data: catalogData } = await supabase.from('specialties').select('id, name').order('name');
            if (catalogData) setCatalogSpecialties(catalogData);

            const { data: clinicData } = await supabase.from('clinics').select('settings').eq('id', clinicId).single();
            if (clinicData?.settings) {
                setSettings(prev => ({
                    ...prev,
                    ...clinicData.settings,
                    branding: { colors: { primary: '#2563eb', secondary: '#ffffff', ...clinicData.settings.branding?.colors }, logos: { ...prev.branding?.logos, ...clinicData.settings.branding?.logos } },
                    institutional: { ...prev.institutional, ...clinicData.settings.institutional }
                }));
            }

            const { data: clinicSpecsData } = await supabase.from('clinic_specialties').select(`id, capacidade, custom_name, specialty_id, is_favorite, specialties ( name )`).eq('clinic_id', clinicId);
            if (clinicSpecsData) {
                const formattedSpecs: Specialty[] = clinicSpecsData.map((item: any) => ({
                    id: item.id, specialty_id: item.specialty_id, name: item.specialties?.name || 'Sem Nome',
                    custom_name: item.custom_name || '', capacidade: item.capacidade ?? 1, is_favorite: item.is_favorite ?? false
                }));
                setClinicSpecialties(formattedSpecs.sort((a, b) => a.name.localeCompare(b.name)));
            }
        } catch (error) { console.error('Erro:', error); } finally { setLoading(false); }
    };

    // --- VIACEP ---
    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            setLoadingAddress(true);
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setSettings(prev => ({
                        ...prev,
                        institutional: {
                            ...prev.institutional!,
                            address: data.logradouro.toUpperCase(),
                            neighborhood: data.bairro.toUpperCase(),
                            city: data.localidade.toUpperCase(),
                            state: data.uf.toUpperCase()
                        }
                    }));
                    setTimeout(() => numberInputRef.current?.focus(), 100);
                }
            } catch (err) { console.error("Erro CEP", err); }
            finally { setLoadingAddress(false); }
        }
    };

    // --- SALVAR ---
    const handleSaveGeneral = async (section: 'settings' | 'branding' | 'data') => {
        if (!currentClinicId) return;
        
        let setter: any;
        if (section === 'settings') setter = setSettingsStatus;
        else if (section === 'branding') setter = setBrandingStatus;
        else setter = setDataStatus;

        setter('saving');
        try {
            await supabase.from('clinics').update({ settings: settings }).eq('id', currentClinicId);
            setter('success'); 
            setTimeout(() => setter('idle'), 2500);
            if (section === 'branding') setIsEditingVisual(false);
            if (section === 'data') setIsEditingData(false);
        } catch (err) { setter('error'); }
    };

    const handleResetColors = () => {
        setSettings(prev => ({ ...prev, branding: { ...prev.branding, colors: { primary: '#2563eb', secondary: '#ffffff' } } }));
    };

    // --- HANDLERS CAPACIDADE ---
    const handleUpdateCapacity = (id: string, delta: number) => {
        setClinicSpecialties(prev => prev.map(s => s.id === id ? { ...s, capacidade: Math.max(0, (s.capacidade || 0) + delta) } : s));
    };
    const handleUpdateCustomName = (id: string, val: string) => {
        setClinicSpecialties(prev => prev.map(s => s.id === id ? { ...s, custom_name: val } : s));
    };
    const handleToggleFavorite = (id: string) => {
        const count = clinicSpecialties.filter(s => s.is_favorite).length;
        const target = clinicSpecialties.find(s => s.id === id);
        if (!target?.is_favorite && count >= 4) return alert("Limite: Máx 04 favoritos.");
        setClinicSpecialties(prev => prev.map(s => s.id === id ? { ...s, is_favorite: !s.is_favorite } : s));
    };
    const handleSaveCapacities = async () => {
        if (!currentClinicId) return;
        setCapacityStatus('saving');
        try {
            const promises = clinicSpecialties.map(s => supabase.from('clinic_specialties').update({ capacidade: s.capacidade, custom_name: s.custom_name, is_favorite: s.is_favorite }).eq('id', s.id));
            await Promise.all(promises);
            setCapacityStatus('success'); setTimeout(() => setCapacityStatus('idle'), 2500);
        } catch (err) { setCapacityStatus('error'); }
    };

    // --- UPLOAD LOGOS ---
    const handleLogoUpload = async (file: File, type: 'full_horizontal' | 'full_vertical' | 'icon') => {
        if (!currentClinicId) return;
        setUploadingField(type);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `branding/${currentClinicId}/${type}_${Date.now()}.${fileExt}`;
            const { error } = await supabase.storage.from('clinic-assets').upload(fileName, file, { upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('clinic-assets').getPublicUrl(fileName);
            
            const newSettings = { ...settings };
            if(!newSettings.branding) newSettings.branding = {};
            if(!newSettings.branding.logos) newSettings.branding.logos = { full_horizontal:null, full_vertical:null, icon:null };
            // @ts-ignore
            newSettings.branding.logos[type] = publicUrl;
            setSettings(newSettings);
            await supabase.from('clinics').update({ settings: newSettings }).eq('id', currentClinicId);
        } catch (error) { alert('Erro no upload.'); } finally { setUploadingField(null); }
    };

    // --- UI HELPERS ---
    const TabPill = ({ id, label, icon: Icon }: any) => (
        <button onClick={() => setActiveTab(id)} className={`relative px-4 py-2 text-sm font-bold transition-all duration-300 rounded-full flex items-center gap-2 z-10 ${activeTab === id ? 'text-blue-600 shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={14} className={activeTab === id ? 'text-blue-600' : 'text-slate-400'}/> {label}
        </button>
    );

    const UserCard = ({ u }: { u: AdminUser }) => {
        const style = getRoleStyle(u.role);
        return (
            <div onClick={() => handleOpenEdit(u)} className={`bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex overflow-hidden group relative cursor-pointer hover:-translate-y-1`}>
                <div className={`w-1.5 ${style.badge.split(' ')[0].replace('bg', 'bg')}`}></div>
                <div className="p-4 flex gap-4 w-full items-center">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm overflow-hidden">
                        {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : <span className="font-bold text-slate-400 text-lg">{u.name.charAt(0)}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${style.badge}`}>{style.label}</span>
                            {u.registry && <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><BadgeCheck size={10}/> {u.registry}</span>}
                        </div>
                        <h3 className="text-sm font-black text-slate-800 truncate uppercase">{u.name}</h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{u.email || 'Sem email'}</p>
                    </div>
                </div>
            </div>
        );
    };

    const LogoUploader = ({ label, type, currentUrl }: any) => (
        <div className="relative group cursor-pointer border-2 border-dashed border-slate-200 rounded-2xl h-32 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all overflow-hidden">
            {currentUrl ? <img src={currentUrl} className="h-full w-full object-contain p-2" /> : <ImageIcon className="text-slate-300 mb-2"/>}
            {!currentUrl && <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>}
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <span className="text-white font-bold text-xs bg-white/20 px-3 py-1 rounded-full border border-white/50">Alterar</span>
            </div>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0], type)} disabled={!!uploadingField}/>
            {uploadingField === type && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>}
        </div>
    );

    const managementUsers = users.filter(u => ['admin', 'manager', 'receptionist'].includes(u.role));
    const healthUsers = users.filter(u => u.role === 'therapist');
    const handleOpenEdit = (user: AdminUser) => { setEditingUser(user); setShowWizard(true); };
    const handleOpenNew = () => { setEditingUser(null); setShowWizard(true); };

    // --- RENDER ---
    return (
        <div className="space-y-8 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
            {/* HEADER PREMIUM */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-100 pb-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Administração</h2>
                    <p className="text-slate-500 font-medium">Gestão completa da sua clínica.</p>
                </div>
                <div className="bg-slate-100/80 backdrop-blur-sm p-1.5 rounded-full flex gap-1 shadow-inner overflow-x-auto max-w-full">
                    <TabPill id="team" label="Equipe" icon={Users} />
                    <TabPill id="settings" label="Configurações" icon={Settings} />
                    <TabPill id="branding" label="Identidade" icon={Palette} />
                </div>
            </div>

            {loading ? <AdminSkeleton /> : (
                <>
                    {/* === ABA 1: EQUIPE === */}
                    {activeTab === 'team' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Users size={20}/></div>
                                    <div><h3 className="font-bold text-blue-900">Membros Ativos</h3><p className="text-xs text-blue-600">{users.length} profissionais cadastrados</p></div>
                                </div>
                                <button onClick={handleOpenNew} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 flex items-center gap-2 text-xs uppercase tracking-wide transition-all active:scale-95"><Plus size={16}/> Novo</button>
                            </div>
                            
                            {managementUsers.length > 0 && (
                                <div className="animate-slide-up">
                                    <div className="flex items-center gap-2 mb-4 px-1"><Building2 className="text-purple-600" size={18}/><h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Gestão & Recepção</h3></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{managementUsers.map(u => <UserCard key={u.id} u={u} />)}</div>
                                </div>
                            )}

                            {(managementUsers.length > 0 && healthUsers.length > 0) && <div className="h-px bg-slate-100"></div>}

                            {healthUsers.length > 0 && (
                                <div className="animate-slide-up" style={{animationDelay: '0.1s'}}>
                                    <div className="flex items-center gap-2 mb-4 px-1"><Stethoscope className="text-emerald-600" size={18}/><h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Corpo Clínico</h3></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{healthUsers.map(u => <UserCard key={u.id} u={u} />)}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* === ABA 2: CONFIGURAÇÕES (CORRIGIDA) === */}
                    {activeTab === 'settings' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-slide-up">
                            {/* Card Horários */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="bg-slate-50/50 p-6 border-b border-slate-100"><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Clock className="text-blue-500"/> Horários</h3></div>
                                <div className="p-8 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Abertura</label>
                                            <input type="time" className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all" value={settings.opens_at} onChange={e => setSettings({...settings, opens_at: e.target.value})}/>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Fechamento</label>
                                            <input type="time" className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all" value={settings.closes_at} onChange={e => setSettings({...settings, closes_at: e.target.value})}/>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Início Almoço</label>
                                            <input type="time" className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all" value={settings.lunch_start} onChange={e => setSettings({...settings, lunch_start: e.target.value})}/>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Fim Almoço</label>
                                            <input type="time" className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all" value={settings.lunch_end} onChange={e => setSettings({...settings, lunch_end: e.target.value})}/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Duração da Sessão</label>
                                        <select className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 bg-white transition-all" value={settings.slot_duration} onChange={e => setSettings({...settings, slot_duration: parseInt(e.target.value)})}>
                                            <option value={20}>20 minutos</option>
                                            <option value={30}>30 minutos</option>
                                            <option value={40}>40 minutos</option>
                                            <option value={50}>50 minutos</option>
                                            <option value={60}>60 minutos</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                    <button onClick={() => handleSaveGeneral('settings')} disabled={settingsStatus === 'saving'} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 text-sm">
                                        {settingsStatus === 'saving' ? 'Salvando...' : <><Save size={18}/> Salvar Regras</>}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Card Capacidade */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                                <div className="bg-slate-50 p-6 border-b border-slate-100 shrink-0"><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><BarChart3 className="text-blue-600"/> Capacidade e Nomes</h3></div>
                                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                                    {clinicSpecialties.map(spec => (
                                        <div key={spec.id} className={`p-4 border rounded-2xl transition-all shadow-sm ${spec.capacidade === 0 ? 'bg-slate-50 opacity-80' : 'bg-white hover:border-blue-200'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleToggleFavorite(spec.id)} className={`transition-all duration-200 ${spec.is_favorite ? 'text-amber-500 scale-110' : 'text-slate-200 hover:text-amber-200'}`}><Star size={20} fill={spec.is_favorite ? "currentColor" : "none"} /></button>
                                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Original</p><span className="text-xs font-medium text-slate-600">{spec.name}</span></div>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
                                                    <button onClick={() => handleUpdateCapacity(spec.id, -1)} className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-red-100 text-slate-500 rounded-md"><Minus size={14}/></button>
                                                    <div className="w-6 text-center font-bold text-sm">{spec.capacidade}</div>
                                                    <button onClick={() => handleUpdateCapacity(spec.id, 1)} className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-blue-100 text-blue-600 rounded-md"><PlusIcon size={14}/></button>
                                                </div>
                                            </div>
                                            <input type="text" className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white uppercase placeholder:normal-case transition-all text-sm" value={spec.custom_name || ''} onChange={(e) => handleUpdateCustomName(spec.id, e.target.value.toUpperCase())} placeholder={`APELIDO`} />
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                    <button onClick={handleSaveCapacities} disabled={capacityStatus === 'saving'} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 text-sm">
                                        {capacityStatus === 'saving' ? '...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === ABA 3: IDENTIDADE === */}
                    {activeTab === 'branding' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in">
                            {/* CARD A: VISUAL */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Palette className="text-purple-600"/> Identidade Visual</h3>
                                    {!isEditingVisual && <button onClick={() => setIsEditingVisual(true)} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><Edit3 size={12}/> Editar</button>}
                                </div>
                                {isEditingVisual ? (
                                    <div className="p-8 space-y-8 animate-scale-in">
                                        <div className="flex justify-end"><button onClick={handleResetColors} className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1"><RotateCcw size={12}/> Resetar Cores</button></div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <LogoUploader label="Horizontal" type="full_horizontal" currentUrl={settings.branding?.logos?.full_horizontal} />
                                            <LogoUploader label="Vertical" type="full_vertical" currentUrl={settings.branding?.logos?.full_vertical} />
                                            <LogoUploader label="Ícone" type="icon" currentUrl={settings.branding?.logos?.icon} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Cor Primária</label><input type="color" className="w-full h-10 rounded-lg cursor-pointer border-none" value={settings.branding?.colors?.primary} onChange={e => setSettings({...settings, branding:{...settings.branding, colors:{...settings.branding?.colors, primary:e.target.value} as any}})}/></div>
                                            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Cor Secundária</label><input type="color" className="w-full h-10 rounded-lg cursor-pointer border-none" value={settings.branding?.colors?.secondary} onChange={e => setSettings({...settings, branding:{...settings.branding, colors:{...settings.branding?.colors, secondary:e.target.value} as any}})}/></div>
                                        </div>
                                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                            <button onClick={() => setIsEditingVisual(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button>
                                            <button onClick={() => handleSaveGeneral('branding')} disabled={brandingStatus === 'saving'} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2">{brandingStatus === 'saving' ? 'Salvando...' : 'Salvar Visual'}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center space-y-6">
                                        <div className="h-24 flex items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            {settings.branding?.logos?.full_horizontal ? <img src={settings.branding.logos.full_horizontal} className="h-full object-contain"/> : <span className="text-slate-300 font-bold text-xs uppercase">Logo Horizontal não definida</span>}
                                        </div>
                                        <div className="flex justify-center gap-8">
                                            <div className="text-center"><div className="w-12 h-12 rounded-2xl shadow-sm mx-auto mb-2 border border-slate-100" style={{backgroundColor: settings.branding?.colors?.primary}}></div><span className="text-[10px] font-mono text-slate-400 uppercase">Primária</span></div>
                                            <div className="text-center"><div className="w-12 h-12 rounded-2xl shadow-sm mx-auto mb-2 border border-slate-100" style={{backgroundColor: settings.branding?.colors?.secondary}}></div><span className="text-[10px] font-mono text-slate-400 uppercase">Secundária</span></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* CARD B: DADOS INSTITUCIONAIS */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Building2 className="text-blue-600"/> Dados da Clínica</h3>
                                    {!isEditingData && <button onClick={() => setIsEditingData(true)} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><Edit3 size={12}/> Editar</button>}
                                </div>
                                {isEditingData ? (
                                    <div className="p-8 space-y-6 animate-scale-in">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">CNPJ</label>
                                                <input className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-sm" placeholder="00.000.000/0000-00" value={settings.institutional?.cnpj} onChange={e => setSettings({...settings, institutional: {...settings.institutional!, cnpj: formatCNPJ(e.target.value)}})}/>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Telefone</label>
                                                <input className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-sm" placeholder="(00) 00000-0000" value={settings.institutional?.phone} onChange={e => setSettings({...settings, institutional: {...settings.institutional!, phone: formatPhone(e.target.value)}})}/>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                                            <div className="flex gap-4">
                                                <div className="w-1/3 relative">
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">CEP (Busca Auto)</label>
                                                    <input className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 bg-white transition-all text-sm pr-8" placeholder="00000-000" value={settings.institutional?.cep || ''} onChange={e => setSettings({...settings, institutional: {...settings.institutional!, cep: formatCEP(e.target.value)}})} onBlur={handleCepBlur} />
                                                    {loadingAddress && <div className="absolute right-3 top-9"><Loader2 className="animate-spin text-blue-500" size={16}/></div>}
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Endereço</label>
                                                    <input className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-500 bg-slate-100 outline-none text-sm cursor-not-allowed" readOnly value={settings.institutional?.address || ''} />
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="w-1/4">
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Número</label>
                                                    <input ref={numberInputRef} className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 bg-white transition-all text-sm" value={settings.institutional?.number || ''} onChange={e => setSettings({...settings, institutional: {...settings.institutional!, number: e.target.value}})} />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Bairro</label>
                                                    <input className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-500 bg-slate-100 outline-none text-sm cursor-not-allowed" readOnly value={settings.institutional?.neighborhood || ''} />
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Cidade</label>
                                                    <input className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-500 bg-slate-100 outline-none text-sm cursor-not-allowed" readOnly value={settings.institutional?.city || ''} />
                                                </div>
                                                <div className="w-20">
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">UF</label>
                                                    <input className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-500 bg-slate-100 outline-none text-sm cursor-not-allowed" readOnly value={settings.institutional?.state || ''} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                            <button onClick={() => setIsEditingData(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button>
                                            <button onClick={() => handleSaveGeneral('data')} disabled={dataStatus === 'saving'} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2">{dataStatus === 'saving' ? 'Salvando...' : 'Salvar Dados'}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 space-y-6">
                                        <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Empresa</label><p className="text-sm font-bold text-slate-700">{settings.institutional?.cnpj || 'CNPJ não informado'}</p></div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Endereço</label>
                                            <p className="text-sm font-medium text-slate-600 max-w-md leading-relaxed">
                                                {settings.institutional?.address ? `${settings.institutional.address}, ${settings.institutional.number} - ${settings.institutional.neighborhood}` : 'Endereço não configurado'}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1 uppercase">{settings.institutional?.city} - {settings.institutional?.state}</p>
                                        </div>
                                        <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Contato</label><p className="text-sm font-bold text-slate-700">{settings.institutional?.phone || 'Sem telefone'}</p></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
            
            {/* WIZARD */}
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