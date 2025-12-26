/* src/components/admin/ProfessionalWizard.tsx - VERSÃO 5.1 (CORREÇÃO BIRTH_DATE) */
import React, { useState, useEffect } from 'react';
import { 
    X, User, Mail, Lock, Phone, Camera, 
    ChevronRight, ChevronLeft, CheckCircle2, 
    Eye, EyeOff, Loader2, Stethoscope,
    Copy, ShieldAlert, Edit3 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../config/supabase-constants';

// --- TIPOS ---
type WorkMode = 'off' | 'morning' | 'afternoon' | 'full';

// Mapeamento Exato para o Banco (Constraints PT-BR)
const DB_PERIOD_MAP: Record<WorkMode, string | null> = {
    'off': null,
    'morning': 'matutino',
    'afternoon': 'vespertino',
    'full': 'diurno'
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    clinicId: string;
    specialtiesCatalog: { id: string; name: string }[];
    userToEdit?: any | null; 
}

const WEEKDAYS = [
    { idx: 1, label: 'Segunda-feira', short: 'SEG' },
    { idx: 2, label: 'Terça-feira', short: 'TER' },
    { idx: 3, label: 'Quarta-feira', short: 'QUA' },
    { idx: 4, label: 'Quinta-feira', short: 'QUI' },
    { idx: 5, label: 'Sexta-feira', short: 'SEX' },
];

// --- MÁSCARAS ---
const maskCPF = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

const maskPhone = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
};

export const ProfessionalWizard: React.FC<Props> = ({ 
    isOpen, onClose, onSuccess, clinicId, specialtiesCatalog, userToEdit 
}) => {
    if (!isOpen) return null;

    const isEdit = !!userToEdit;
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    // --- ESTADO GERAL ---
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        cpf: '',
        birthDate: '',
        registry: '',
        role: 'therapist' 
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    
    // --- ESPECIALIDADES ---
    const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);

    // --- JORNADA (ESCALA) ---
    const [schedule, setSchedule] = useState<Record<number, WorkMode>>({
        1: 'off', 2: 'off', 3: 'off', 4: 'off', 5: 'off'
    });

    const [createdCreds, setCreatedCreds] = useState<{login: string, pass: string} | null>(null);

    // --- CARREGAR DADOS NA EDIÇÃO ---
    useEffect(() => {
        if (isEdit && userToEdit) {
            setFormData({
                name: userToEdit.name || '',
                email: userToEdit.email || '', 
                password: '', 
                phone: userToEdit.phone || '',
                cpf: userToEdit.cpf || '',
                birthDate: userToEdit.birth_date || '',
                registry: userToEdit.registry || '',
                role: userToEdit.role || 'therapist'
            });
            setAvatarPreview(userToEdit.avatar_url);

            const loadRelations = async () => {
                // Especialidades
                const { data: specs } = await supabase.from('professional_specialties').select('specialty_id').eq('professional_id', userToEdit.id);
                if (specs) setSelectedSpecs(specs.map(s => s.specialty_id));

                // Disponibilidade
                const { data: avail } = await supabase.from('professional_availability').select('weekday, period').eq('profile_id', userToEdit.id);
                if (avail && avail.length > 0) {
                    const newSched = { ...schedule };
                    avail.forEach((a: any) => {
                        let mode: WorkMode = 'off';
                        if (a.period === 'matutino') mode = 'morning';
                        else if (a.period === 'vespertino') mode = 'afternoon';
                        else if (a.period === 'diurno') mode = 'full';
                        
                        if (mode !== 'off') newSched[a.weekday] = mode;
                    });
                    setSchedule(newSched);
                }
            };
            loadRelations();
        }
    }, [userToEdit]);

    // --- LÓGICA DE SALVAMENTO ---
    const handleSave = async () => {
        setLoading(true);
        setErrorMsg('');

        try {
            let targetId = userToEdit?.id;
            let finalAvatarUrl = avatarPreview;

            // 1. CRIAÇÃO DE USUÁRIO (Apenas se for novo)
            if (!isEdit) {
                if (!formData.password || formData.password.length < 6) throw new Error("Senha deve ter no mínimo 6 caracteres.");
                if (!formData.email) throw new Error("Email é obrigatório.");

                const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { 
                    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } 
                });

                const { data: authData, error: authError } = await tempClient.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: { 
                        data: { 
                            name: formData.name.toUpperCase(), 
                            clinic_id: clinicId, 
                            role: formData.role 
                        } 
                    }
                });

                if (authError) throw authError;
                if (!authData.user) throw new Error("Erro ao criar usuário Auth.");
                
                targetId = authData.user.id;
                setCreatedCreds({ login: formData.email, pass: formData.password });
            }

            // 2. UPLOAD DA FOTO
            if (avatarFile && targetId) {
                const fileName = `${targetId}/${Date.now()}.jpg`;
                const { error: upErr } = await supabase.storage.from('profile-avatars').upload(fileName, avatarFile, { upsert: true });
                if (!upErr) {
                    const { data: urlData } = supabase.storage.from('profile-avatars').getPublicUrl(fileName);
                    finalAvatarUrl = urlData.publicUrl;
                }
            }

            // 3. SALVAR PERFIL (UPSERT = ATUALIZAR OU CRIAR)
            // Tratamento rigoroso de tipos para evitar 400 Bad Request
            const profilePayload = {
                id: targetId, // Obrigatório para upsert
                clinic_id: clinicId,
                name: formData.name.toUpperCase(),
                role: formData.role,
                registry: formData.registry ? formData.registry.toUpperCase() : null,
                phone: formData.phone || null,
                cpf: formData.cpf || null,
                birth_date: formData.birthDate || null, // Sincronizado com a nova coluna no banco
                avatar_url: finalAvatarUrl,
                updated_at: new Date().toISOString()
            };

            // Upsert é a chave aqui: se o trigger já criou, ele atualiza. Se não, ele cria.
            const { error: profError } = await supabase
                .from('profiles')
                .upsert(profilePayload, { onConflict: 'id' });

            if (profError) {
                console.error("Erro ao salvar perfil:", profError);
                throw new Error(`Erro ao salvar dados do perfil: ${profError.message}`);
            }

            // 4. VÍNCULOS (Apenas Terapeutas)
            if (formData.role === 'therapist') {
                if (selectedSpecs.length === 0) throw new Error("Selecione pelo menos uma especialidade.");

                // Limpar anteriores
                if (isEdit) {
                    await supabase.from('professional_specialties').delete().eq('professional_id', targetId);
                    await supabase.from('professional_availability').delete().eq('profile_id', targetId);
                }

                // Inserir Especialidades
                const specsInsert = selectedSpecs.map(sid => ({
                    clinic_id: clinicId,
                    professional_id: targetId,
                    specialty_id: sid,
                    is_active: true
                }));
                
                const { error: specErr } = await supabase.from('professional_specialties').insert(specsInsert);
                if (specErr) throw new Error(`Erro ao salvar especialidades: ${specErr.message}`);

                // Inserir Disponibilidade (CORRIGIDO PARA O BANCO)
                const availRows: any[] = [];
                
                Object.entries(schedule).forEach(([dayStr, mode]) => {
                    const dayIdx = parseInt(dayStr);
                    const dbPeriod = DB_PERIOD_MAP[mode]; 

                    if (dbPeriod) { 
                        // Réplica para cada especialidade (Constraint exige isso)
                        selectedSpecs.forEach(specId => {
                            availRows.push({
                                clinic_id: clinicId,
                                profile_id: targetId,
                                specialty_id: specId, 
                                weekday: dayIdx,
                                period: dbPeriod,
                                is_active: true
                            });
                        });
                    }
                });
                
                if (availRows.length > 0) {
                    const { error: availErr } = await supabase.from('professional_availability').insert(availRows);
                    if (availErr) throw new Error(`Erro ao salvar agenda: ${availErr.message}`);
                }
            }

            // FIM
            if (!isEdit) {
                setStep(4); 
            } else {
                onSuccess(); 
            }

        } catch (err: any) {
            console.error("Erro Critical no Wizard:", err);
            setErrorMsg(err.message || "Erro desconhecido ao salvar.");
        } finally {
            setLoading(false);
        }
    };

    const copyCreds = () => {
        if (createdCreds) {
            const text = `Olá, aqui estão suas credenciais de acesso ao Aizul Aura One:\n\nLogin: ${createdCreds.login}\nSenha: ${createdCreds.pass}\n\nAcesse em: app.aizulaura.com.br`;
            navigator.clipboard.writeText(text);
            alert("Copiado para a área de transferência!");
        }
    };

    // --- RENDERIZAÇÃO ---
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div>
                        <h3 className="font-bold text-xl text-slate-800 uppercase flex items-center gap-2">
                            {isEdit ? <Edit3 size={20} className="text-blue-600"/> : <User size={20} className="text-blue-600"/>}
                            {isEdit ? 'Editar Profissional' : 'Novo Profissional'}
                        </h3>
                        {step < 4 && <p className="text-xs text-slate-400 font-bold uppercase mt-1">Passo {step} de 3</p>}
                    </div>
                    {step < 4 && <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="text-slate-400 hover:text-red-500" /></button>}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 custom-scrollbar">
                    
                    {/* PASSO 1: IDENTIDADE E ACESSO */}
                    {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-in-right">
                            {/* Coluna da Foto */}
                            <div className="col-span-1 flex flex-col items-center">
                                <div className="relative group w-48 h-48 rounded-full bg-white border-4 border-slate-200 shadow-sm flex items-center justify-center overflow-hidden mb-4">
                                    {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover"/> : <User size={64} className="text-slate-300"/>}
                                    <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <Camera className="text-white"/>
                                    </label>
                                    <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={e => {
                                        if(e.target.files?.[0]) {
                                            setAvatarFile(e.target.files[0]);
                                            setAvatarPreview(URL.createObjectURL(e.target.files[0]));
                                        }
                                    }}/>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-700 uppercase">Foto de Perfil</p>
                                    <p className="text-[10px] text-slate-400">Visível para pacientes</p>
                                </div>
                            </div>

                            {/* Coluna do Formulário */}
                            <div className="col-span-1 md:col-span-2 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome Completo *</label>
                                        <input className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 uppercase focus:ring-2 focus:ring-blue-500 outline-none" 
                                            placeholder="EX: DR. JOÃO SILVA"
                                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">CPF</label>
                                        <input className="w-full p-3 border border-slate-200 rounded-xl" placeholder="000.000.000-00" maxLength={14}
                                            value={formData.cpf} onChange={e => setFormData({...formData, cpf: maskCPF(e.target.value)})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nascimento</label>
                                        <input type="date" className="w-full p-3 border border-slate-200 rounded-xl text-slate-600"
                                            value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">WhatsApp / Celular</label>
                                        <input className="w-full p-3 border border-slate-200 rounded-xl" placeholder="(00) 00000-0000" maxLength={15}
                                            value={formData.phone} onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Função / Cargo</label>
                                        <select className="w-full p-3 border border-slate-200 rounded-xl bg-white font-bold text-slate-700 uppercase"
                                            value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                                        >
                                            <option value="therapist">Profissional de Saúde</option>
                                            <option value="receptionist">Recepção</option>
                                            <option value="manager">Gestor / Admin</option>
                                        </select>
                                    </div>
                                    {formData.role === 'therapist' && (
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Registro Profissional (CRM/CREFITO)</label>
                                            <input className="w-full p-3 border border-slate-200 rounded-xl uppercase" placeholder="EX: 12345-F"
                                                value={formData.registry} onChange={e => setFormData({...formData, registry: e.target.value.toUpperCase()})}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* SEÇÃO DE ACESSO (CRÍTICA) */}
                                {!isEdit && (
                                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 mt-4">
                                        <h4 className="text-xs font-black text-blue-700 uppercase mb-3 flex items-center gap-2"><Lock size={14}/> Credenciais de Acesso</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email (Login) *</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-3.5 text-slate-400 w-4 h-4"/>
                                                    <input className="w-full pl-10 p-3 border border-blue-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 lowercase" 
                                                        placeholder="email@clinica.com"
                                                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Senha Inicial *</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-3.5 text-slate-400 w-4 h-4"/>
                                                    <input 
                                                        type={showPassword ? "text" : "password"}
                                                        className="w-full pl-10 pr-10 p-3 border border-blue-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500" 
                                                        placeholder="Mínimo 6 dígitos"
                                                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                                                    />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-blue-600">
                                                        {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PASSO 2: ESPECIALIDADES */}
                    {step === 2 && (
                        <div className="h-full flex flex-col animate-slide-in-right">
                            <div className="mb-4">
                                <h4 className="text-lg font-bold text-slate-800">Quais áreas este profissional atende?</h4>
                                <p className="text-sm text-slate-500">Selecione todas as especialidades habilitadas para este perfil.</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto pb-4">
                                {specialtiesCatalog.map(spec => {
                                    const isSelected = selectedSpecs.includes(spec.id);
                                    return (
                                        <button 
                                            key={spec.id}
                                            onClick={() => setSelectedSpecs(prev => isSelected ? prev.filter(x => x !== spec.id) : [...prev, spec.id])}
                                            className={`p-4 rounded-xl border text-left transition-all duration-200 relative group ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.02]' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:shadow-sm'}`}
                                        >
                                            {isSelected && <div className="absolute top-2 right-2 bg-white/20 p-1 rounded-full"><CheckCircle2 size={12} className="text-white"/></div>}
                                            <Stethoscope size={24} className={`mb-2 ${isSelected ? 'text-white/80' : 'text-slate-300 group-hover:text-blue-400'}`}/>
                                            <p className="font-bold text-xs uppercase leading-tight">{spec.name}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PASSO 3: JORNADA DE TRABALHO (ESCALA) */}
                    {step === 3 && (
                        <div className="h-full flex flex-col animate-slide-in-right">
                            <div className="mb-6 flex justify-between items-end">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-800">Escala Semanal</h4>
                                    <p className="text-sm text-slate-500">Defina os turnos de atendimento (Segunda a Sexta).</p>
                                </div>
                                <div className="flex gap-2 text-[10px] font-bold uppercase text-slate-400">
                                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-slate-200"></div> Off</span>
                                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-400"></div> Manhã</span>
                                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Tarde</span>
                                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Integral</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {WEEKDAYS.map(day => {
                                    const mode = schedule[day.idx];
                                    return (
                                        <div key={day.idx} className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                                            <div className="pl-3 w-32 shrink-0">
                                                <p className="text-xs font-bold text-slate-800 uppercase">{day.label}</p>
                                            </div>
                                            
                                            <div className="flex bg-slate-100 p-1 rounded-lg gap-1 flex-1 max-w-md">
                                                <button 
                                                    onClick={() => setSchedule(prev => ({...prev, [day.idx]: 'off'}))}
                                                    className={`flex-1 py-2 rounded-md text-[10px] font-bold uppercase transition-all ${mode === 'off' ? 'bg-white text-slate-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    OFF
                                                </button>
                                                <button 
                                                    onClick={() => setSchedule(prev => ({...prev, [day.idx]: 'morning'}))}
                                                    className={`flex-1 py-2 rounded-md text-[10px] font-bold uppercase transition-all ${mode === 'morning' ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200' : 'text-slate-400 hover:text-amber-600'}`}
                                                >
                                                    Manhã
                                                </button>
                                                <button 
                                                    onClick={() => setSchedule(prev => ({...prev, [day.idx]: 'afternoon'}))}
                                                    className={`flex-1 py-2 rounded-md text-[10px] font-bold uppercase transition-all ${mode === 'afternoon' ? 'bg-orange-100 text-orange-700 shadow-sm border border-orange-200' : 'text-slate-400 hover:text-orange-600'}`}
                                                >
                                                    Tarde
                                                </button>
                                                <button 
                                                    onClick={() => setSchedule(prev => ({...prev, [day.idx]: 'full'}))}
                                                    className={`flex-1 py-2 rounded-md text-[10px] font-bold uppercase transition-all ${mode === 'full' ? 'bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200' : 'text-slate-400 hover:text-emerald-600'}`}
                                                >
                                                    Integral
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PASSO 4: SUCESSO / HANDOVER */}
                    {step === 4 && createdCreds && (
                        <div className="h-full flex flex-col items-center justify-center text-center animate-scale-in">
                            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-50">
                                <CheckCircle2 size={48} className="text-emerald-600"/>
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase">Profissional Cadastrado!</h2>
                            <p className="text-slate-500 mb-8 max-w-md">O acesso já está ativo. Envie as credenciais abaixo para o profissional iniciar o uso.</p>

                            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md text-left shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Lock size={100} className="text-white"/></div>
                                <p className="text-slate-400 text-[10px] font-bold uppercase mb-4 tracking-widest border-b border-slate-700 pb-2">Cartão de Acesso</p>
                                
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Login</p>
                                        <p className="text-white font-mono text-lg">{createdCreds.login}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Senha Provisória</p>
                                        <p className="text-emerald-400 font-mono text-lg tracking-wider">{createdCreds.pass}</p>
                                    </div>
                                </div>

                                <button onClick={copyCreds} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                                    <Copy size={18}/> COPIAR DADOS
                                </button>
                            </div>

                            <button onClick={() => { onSuccess(); onClose(); }} className="mt-8 text-slate-400 hover:text-slate-600 font-bold text-sm uppercase">Fechar e Voltar</button>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600">
                            <ShieldAlert size={20}/>
                            <span className="text-sm font-bold">{errorMsg}</span>
                        </div>
                    )}

                </div>

                {/* Footer Actions (Só aparece passos 1-3) */}
                {step < 4 && (
                    <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-between shrink-0">
                        {step > 1 ? (
                            <button onClick={() => setStep(s => s - 1)} className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2">
                                <ChevronLeft size={18}/> Voltar
                            </button>
                        ) : (
                            <button onClick={onClose} className="px-6 py-3 text-slate-400 hover:text-red-500 font-bold text-sm">Cancelar</button>
                        )}

                        <button 
                            onClick={() => {
                                if (step === 3 || (formData.role !== 'therapist' && step === 1)) {
                                    handleSave();
                                } else {
                                    if (step === 1 && !formData.name) return alert("Preencha o nome.");
                                    setStep(s => s + 1);
                                }
                            }}
                            disabled={loading}
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <><Loader2 className="animate-spin"/> Salvando...</> : 
                             (step === 3 || (formData.role !== 'therapist' && step === 1) ? 'FINALIZAR CADASTRO' : <>Próximo <ChevronRight size={18}/></>)}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};