/* src/views/PatientList.tsx */
import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { PatientFormModal } from "../components/agenda/PatientFormModal";
import { PatientImportModal } from "../components/patients/PatientImportModal";
import { PatientUI } from "../types";
import { PatientDesktopRow } from "../components/patients/PatientDesktopRow";
import { Plus, Search, User, Loader2, ChevronDown, ChevronRight, UploadCloud, Stethoscope, MessageCircle, CreditCard, Activity } from "lucide-react";

// --- HELPERS ---
function calculateAge(birthDateString?: string | null): number | null {
  if (!birthDateString) return null;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

function getPublicAvatarUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const { data } = supabase.storage.from("patient-avatars").getPublicUrl(path);
  return data.publicUrl;
}

const openWhatsApp = (phone: string) => {
  const cleanNumber = phone.replace(/\D/g, "");
  window.open(`https://wa.me/55${cleanNumber}`, "_blank");
};

// --- COMPONENTES VISUAIS ---

// 📱 MOBILE CARD 2.0: AGORA COM DADOS DO CONVÊNIO
const PatientMobileCard: React.FC<{ patient: PatientUI; onClick: () => void; onOpenRecord: () => void; }> = ({ patient, onClick, onOpenRecord }) => {
  const [insuranceName, setInsuranceName] = useState<string>('');

  // Busca nome do convênio (igual ao Desktop)
  useEffect(() => {
    if (patient.insurance_provider_id && !patient.insurance_plan) {
        const fetchInsuranceName = async () => {
            const { data } = await supabase.from('insurance_providers').select('name').eq('id', patient.insurance_provider_id).single();
            if (data) setInsuranceName(data.name);
        };
        fetchInsuranceName();
    } else if (patient.insurance_plan) {
        setInsuranceName(patient.insurance_plan);
    }
  }, [patient.insurance_provider_id, patient.insurance_plan]);

  return (
    <div onClick={onClick} className="bg-white p-4 border-b border-slate-100 active:bg-slate-50 transition-colors">
      
      {/* 1. CABEÇALHO: FOTO + NOME */}
      <div className="flex gap-4 mb-3">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shadow-sm">
             {patient.avatar_url ? <img src={patient.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={24} /></div>}
          </div>
          {(patient.sessions_total || 0) > 0 && <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>}
        </div>
        
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <h4 className="font-bold text-slate-800 text-base truncate uppercase leading-tight">{patient.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{patient.age ? `${patient.age} ANOS` : 'ID. N/D'}</span>
            <span className="text-[10px] font-mono text-slate-400">{patient.cpf || 'SEM CPF'}</span>
          </div>
        </div>
      </div>

      {/* 2. BLOCO DE CONVÊNIO (HIGHLIGHT) */}
      <div className="mb-4 bg-slate-50/80 rounded-lg p-3 border border-slate-100 flex flex-col gap-1">
         {patient.insurance_provider_id ? (
             <>
                <div className="flex items-center gap-2 text-xs font-black text-purple-700 uppercase">
                    <CreditCard size={14} className="text-purple-500"/>
                    {insuranceName || 'BUSCANDO CONVÊNIO...'}
                </div>
                {patient.insurance_card_number ? (
                    <div className="text-[11px] text-slate-500 font-mono pl-6 tracking-wide">
                       CART: {patient.insurance_card_number}
                    </div>
                ) : (
                    <div className="text-[10px] text-slate-400 pl-6 italic">Sem nº de carteirinha</div>
                )}
             </>
         ) : (
             <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                 <User size={14}/> PARTICULAR
             </div>
         )}
      </div>

      {/* 3. BOTÕES DE AÇÃO */}
      <div className="grid grid-cols-5 gap-3">
        {patient.phone ? (
            <button 
                onClick={(e) => { e.stopPropagation(); openWhatsApp(patient.phone!); }} 
                className="col-span-1 flex items-center justify-center h-11 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 active:scale-95 transition-transform"
            >
                <MessageCircle size={22} />
            </button>
        ) : (
            <div className="col-span-1 flex items-center justify-center h-11 bg-slate-50 text-slate-300 rounded-xl border border-slate-100"><User size={20} /></div>
        )}
        
        <button 
            onClick={(e) => { e.stopPropagation(); onOpenRecord(); }} 
            className="col-span-4 flex items-center justify-center gap-2 h-11 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 active:bg-blue-700 active:scale-[0.98] transition-all uppercase tracking-wide"
        >
            <Activity size={18} /> ABRIR PRONTUÁRIO
        </button>
      </div>

    </div>
  );
};

const PatientDirectoryGroup: React.FC<{ letter: string; isOpen: boolean; onToggle: () => void; clinicId: string; onOpenRecord: (p: PatientUI) => void; onEdit: (p: PatientUI) => void; refreshTrigger: number; }> = ({ letter, isOpen, onToggle, clinicId, onOpenRecord, onEdit, refreshTrigger }) => {
  const [patients, setPatients] = useState<PatientUI[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchGroupData();
  }, [isOpen, refreshTrigger]);

  const fetchGroupData = async () => {
    setLoading(true);
    try {
      const { data: patientsData } = await supabase.from("patients").select("*").eq("clinic_id", clinicId).ilike("name", `${letter}%`).order("name", { ascending: true });
      if (!patientsData) return;

      const patientIds = patientsData.map(p => p.id);
      let progressMap = new Map();
      if (patientIds.length > 0) {
          const { data: progressData } = await supabase.from("view_patient_progress").select("*").in("patient_id", patientIds).eq("active", true);
          progressData?.forEach((item: any) => progressMap.set(item.patient_id, item));
      }

      setPatients(patientsData.map((p: any) => ({
        ...p, age: calculateAge(p.birth_date), avatar_url: getPublicAvatarUrl(p.profile_photo_path),
        active_cycle_title: progressMap.get(p.id)?.cycle_title, sessions_total: progressMap.get(p.id)?.total_sessions || 0, sessions_used: progressMap.get(p.id)?.sessions_used || 0,
      })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="w-full">
      <div onClick={onToggle} className="group flex items-center py-5 cursor-pointer hover:bg-slate-50 transition-colors px-4">
        <div className={`flex-1 h-px transition-all ${isOpen ? 'bg-blue-200' : 'bg-slate-100 group-hover:bg-slate-200'}`}></div>
        <div className={`mx-4 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all shadow-sm ${isOpen ? 'bg-blue-600 text-white border-blue-600 scale-110' : 'bg-white text-slate-400 border-slate-200 group-hover:border-blue-400 group-hover:text-blue-500'}`}>{letter}</div>
        <div className={`flex-1 h-px transition-all ${isOpen ? 'bg-blue-200' : 'bg-slate-100 group-hover:bg-slate-200'}`}></div>
        <div className="absolute right-6 text-slate-300">{isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</div>
      </div>
      {isOpen && (
        <div className="bg-white animate-fade-in-down mb-4">
          {loading ? <div className="p-8 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div> : patients.length === 0 ? <div className="p-6 text-center text-xs font-bold text-slate-300 uppercase bg-slate-50/50 mx-4 rounded-xl border border-dashed border-slate-200">Nenhum paciente com a letra {letter}</div> : (
            <div>
              <div className="hidden md:block border-t border-slate-100">{patients.map(p => <PatientDesktopRow key={p.id} patient={p} onClick={() => onEdit(p)} onOpenRecord={() => onOpenRecord(p)} onWhatsApp={(phone) => openWhatsApp(phone)} />)}</div>
              <div className="md:hidden">{patients.map(p => <PatientMobileCard key={p.id} patient={p} onClick={() => onEdit(p)} onOpenRecord={() => onOpenRecord(p)} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface PatientListProps { onSelectPatient: (patient: any) => void; onNewPatient: () => void; }

const PatientList: React.FC<PatientListProps> = ({ onSelectPatient, onNewPatient }) => {
  const [search, setSearch] = useState("");
  const [openLetter, setOpenLetter] = useState<string | null>("A");
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<PatientUI[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Controle de Refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any | null>(null);

  const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from("profiles").select("clinic_id").eq("auth_user_id", user.id).single();
        if (data) setClinicId(data.clinic_id);
      }
    });
  }, []);

  useEffect(() => {
    if (!clinicId) return;
    if (search.trim().length < 2) { setSearchResults([]); return; }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
          const { data } = await supabase.from("patients").select("*").eq("clinic_id", clinicId).or(`name.ilike.%${search}%,cpf.ilike.%${search}%,phone.ilike.%${search}%`).limit(20);
          setSearchResults((data as any[]) || []);
      } catch(e) { console.error(e); } finally { setIsSearching(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, clinicId, refreshTrigger]);

  const handleEdit = (p: any) => {
    // Mapeia para o form garantindo que o número da carteirinha venha
    setEditingPatient({ 
        ...p, 
        weight: p.weight || '', 
        height: p.height || '', 
        insurance_provider_id: p.insurance_id || '', 
        insurance_card_number: p.insurance_card_number || p.insurance_card || '' 
    }); 
    setIsModalOpen(true);
  };

  const handleNewPatient = () => {
      setEditingPatient(null);
      setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1); // Força recarregamento das listas
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 min-h-screen bg-white">
      <div className="flex justify-between mb-6 items-center">
        <div><h1 className="text-2xl font-bold text-slate-800">Gestão de Pacientes</h1><p className="text-sm text-slate-500">Diretório Clínico Unificado</p></div>
        <div className="flex gap-2">
            <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"><UploadCloud size={20} /><span className="hidden md:inline">Importar</span></button>
            <button onClick={handleNewPatient} className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"><Plus size={20} /><span className="hidden md:inline">Novo</span></button>
        </div>
      </div>

      <div className="bg-slate-50 p-2 rounded-xl shadow-inner mb-6 border border-slate-100">
        <div className="flex gap-2 items-center bg-white px-4 py-3 rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm">
          <Search size={18} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, CPF ou telefone..." className="w-full bg-transparent outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"/>
          {isSearching && <Loader2 className="animate-spin text-blue-500" size={18} />}
        </div>
      </div>

      <div className="bg-white rounded-2xl min-h-[400px]">
        {search.trim().length >= 2 ? (
          <div className="border rounded-2xl overflow-hidden border-slate-100">
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 text-blue-700 text-xs font-bold uppercase">Resultados ({searchResults.length})</div>
            <div className="hidden md:block">{searchResults.map(p => <PatientDesktopRow key={p.id} patient={p} onClick={() => handleEdit(p)} onOpenRecord={() => onSelectPatient(p)} onWhatsApp={(phone) => openWhatsApp(phone)} />)}</div>
            <div className="md:hidden">{searchResults.map(p => <PatientMobileCard key={p.id} patient={p} onClick={() => handleEdit(p)} onOpenRecord={() => onSelectPatient(p)} />)}</div>
            {searchResults.length === 0 && !isSearching && <div className="p-10 text-center text-slate-400">Nenhum paciente encontrado.</div>}
          </div>
        ) : (
          <div>
            {clinicId && alphabet.map(letter => (
              <PatientDirectoryGroup key={letter} letter={letter} clinicId={clinicId} isOpen={openLetter === letter} onToggle={() => setOpenLetter(openLetter === letter ? null : letter)} onOpenRecord={onSelectPatient} onEdit={handleEdit} refreshTrigger={refreshTrigger} />
            ))}
          </div>
        )}
      </div>

      <PatientImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={handleSuccess} />
      <PatientFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleSuccess} patientToEdit={editingPatient} />
    </div>
  );
};

export default PatientList;