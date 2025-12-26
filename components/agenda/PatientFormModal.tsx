/* src/components/modals/PatientFormModal.tsx - VERSÃO FINAL CORRIGIDA */
import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Camera, User, MapPin, Phone, FileText, ShieldCheck, Loader2, CheckCircle2, AlertCircle, HeartPulse, Users } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import * as patientService from '../../services/patientService';
import { Patient } from '../../types';

// --- MÁSCARAS ---
const masks = {
  cpf: (value: string) => value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1'),
  phone: (value: string) => value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1'),
  cep: (value: string) => value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1')
};

// --- COMPONENTES AUXILIARES ---
const Label: React.FC<{ icon: React.ElementType; text: string; required?: boolean }> = ({ icon: Icon, text, required }) => (
  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1 uppercase tracking-wider">
    <Icon size={12} className="text-blue-500/70"/> {text} {required && <span className="text-red-400">*</span>}
  </label>
);

const InputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-bold placeholder:text-slate-300 placeholder:font-normal hover:border-slate-300 uppercase";

const FormSection: React.FC<{ title: string; icon: React.ElementType; color: string; children: React.ReactNode }> = ({ title, icon: Icon, color, children }) => {
    const colorClasses: Record<string, { bg: string, text: string, border: string }> = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
        violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
    };
    const selected = colorClasses[color] || colorClasses.blue;

    return (
        <div className={`bg-white p-5 rounded-2xl border ${selected.border} shadow-sm relative overflow-hidden group hover:shadow-md transition-all`}>
            <div className={`absolute top-0 left-0 w-1 h-full ${selected.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
            <h4 className={`font-bold ${selected.text} mb-4 text-sm uppercase tracking-wide flex items-center gap-2 pb-2 border-b ${selected.border}`}>
                <div className={`p-1.5 rounded-lg ${selected.bg}`}><Icon size={16}/></div> {title}
            </h4>
            <div className="space-y-4">{children}</div>
        </div>
    );
};

interface InsuranceProvider { id: string; name: string; }

// Estado interno do formulário (nomes amigáveis para o input)
interface PatientFormState {
  name: string; social_name: string; document: string; birth_date: string; gender: string;
  phone: string; email: string; occupation: string; zip_code: string; address: string;
  address_number: string; address_complement: string; neighborhood: string; city: string; state: string;
  insurance_provider_id: string | null; insurance_card_number: string; observations: string;
  referral_source: string; emergency_contact_name: string; emergency_contact_phone: string;
  emergency_contact_kinship: string;
}

const initialState: PatientFormState = {
  name: '', social_name: '', document: '', birth_date: '', gender: '',
  phone: '', email: '', occupation: '', zip_code: '', address: '',
  address_number: '', address_complement: '', neighborhood: '', city: '', state: '',
  insurance_provider_id: null, insurance_card_number: '', observations: '', referral_source: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_kinship: ''
};

interface Props { isOpen: boolean; onClose: () => void; patientToEdit?: Patient | null; onSave?: () => void; onSuccess?: () => void; }

export const PatientFormModal: React.FC<Props> = ({ isOpen, onClose, patientToEdit, onSave, onSuccess }) => {
  const { clinicId } = useAuth();
  const [formData, setFormData] = useState<PatientFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [insuranceProviders, setInsuranceProviders] = useState<InsuranceProvider[]>([]);
  
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [insuranceCardFile, setInsuranceCardFile] = useState<File | null>(null);
  const [insuranceCardPreview, setInsuranceCardPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const cardCameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadInsuranceProviders();
      if (patientToEdit) {
        // LEITURA: Mapeia colunas do banco (JSON Schema) para o estado do form
        setFormData({
          name: (patientToEdit.name || '').toUpperCase(),
          social_name: (patientToEdit.social_name || '').toUpperCase(),
          document: patientToEdit.document || '', // cpf ou document
          birth_date: patientToEdit.birth_date || '',
          gender: (patientToEdit.gender || patientToEdit.sex || '').toUpperCase(),
          phone: patientToEdit.phone || patientToEdit.whatsapp || '',
          email: patientToEdit.email || '', 
          occupation: (patientToEdit.profession || '').toUpperCase(),
          
          zip_code: patientToEdit.zip_code || '',
          address: (patientToEdit.address_street || '').toUpperCase(),
          address_number: (patientToEdit.address_number || '').toUpperCase(),
          address_complement: (patientToEdit.address_complement || '').toUpperCase(),
          neighborhood: (patientToEdit.address_neighborhood || '').toUpperCase(),
          city: (patientToEdit.address_city || '').toUpperCase(),
          state: (patientToEdit.address_state || '').toUpperCase(),
          
          insurance_provider_id: patientToEdit.insurance_provider_id || patientToEdit.insurance_id || null,
          insurance_card_number: (patientToEdit.insurance_card_number || '').toUpperCase(),
          
          observations: (patientToEdit.notes || '').toUpperCase(), // Banco usa 'notes'
          referral_source: (patientToEdit.meta?.referral_source || '').toUpperCase(), // Salvamos no meta jsonb
          
          emergency_contact_name: (patientToEdit.emergency_contact_name || '').toUpperCase(),
          emergency_contact_phone: patientToEdit.emergency_contact_phone || '',
          emergency_contact_kinship: (patientToEdit.emergency_contact_kinship || '').toUpperCase()
        });

        if (patientToEdit.profile_photo_path) {
             const { data } = supabase.storage.from('patient-avatars').getPublicUrl(patientToEdit.profile_photo_path);
             setPhotoPreview(data.publicUrl);
        }
      } else {
        setFormData(initialState);
        setPhotoPreview(null);
        setInsuranceCardPreview(null);
        setProfilePhoto(null);
        setInsuranceCardFile(null);
      }
    }
  }, [isOpen, patientToEdit, clinicId]);

  const loadInsuranceProviders = async () => {
    if (!clinicId) return;
    const providers = await patientService.listInsuranceProviders(clinicId);
    setInsuranceProviders(providers);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Maiúsculas (exceto email e datas)
    if (name !== 'email' && name !== 'birth_date') formattedValue = formattedValue.toUpperCase();
    
    // Máscaras
    if (name === 'document') formattedValue = masks.cpf(value);
    if (name === 'phone') formattedValue = masks.phone(value);
    if (name === 'emergency_contact_phone') formattedValue = masks.phone(value);
    if (name === 'zip_code') formattedValue = masks.cep(value);

    setFormData(prev => ({ ...prev, [name]: formattedValue }));

    // Auto-complete CEP
    if (name === 'zip_code' && value.replace(/\D/g, '').length === 8) fetchAddressByCep(value.replace(/\D/g, ''));
  };

  const fetchAddressByCep = async (cep: string) => {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
            setFormData(prev => ({
                ...prev,
                address: (data.logradouro || '').toUpperCase(),
                neighborhood: (data.bairro || '').toUpperCase(),
                city: (data.localidade || '').toUpperCase(),
                state: (data.uf || '').toUpperCase()
            }));
        }
    } catch (error) { console.error("Erro CEP:", error); }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'card') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      if (type === 'profile') { setProfilePhoto(file); setPhotoPreview(previewUrl); } 
      else { setInsuranceCardFile(file); setInsuranceCardPreview(previewUrl); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return setToast({ message: 'Nome é obrigatório.', type: 'error' });
    
    setLoading(true);
    try {
      // ESCRITA: Mapeia Form -> Nomes EXATOS do Banco (conforme seu JSON)
      const patientPayload: any = {
        clinic_id: clinicId,
        name: formData.name,
        social_name: formData.social_name,
        
        // Documentos
        document: formData.document.replace(/\D/g, '') || null, // CPF no campo document
        cpf: formData.document.replace(/\D/g, '') || null,      // Redundância segura
        rg: null, // Campo existe no banco, mas não no form atual (opcional adicionar)
        
        birth_date: formData.birth_date || null,
        gender: formData.gender || null, // Banco tem coluna 'gender'
        sex: formData.gender || null,    // Banco tem coluna 'sex', preenchemos ambos
        
        // Contato
        phone: formData.phone.replace(/\D/g, '') || null,
        whatsapp: formData.phone.replace(/\D/g, '') || null, // Redundância segura
        email: formData.email || null,
        
        profession: formData.occupation, // Form 'occupation' -> Banco 'profession'
        
        // Endereço (Nomes EXATOS do JSON)
        zip_code: formData.zip_code.replace(/\D/g, ''),
        address_street: formData.address,
        address_number: formData.address_number,
        address_complement: formData.address_complement,
        address_neighborhood: formData.neighborhood,
        address_city: formData.city,
        address_state: formData.state,
        
        // Convênio
        insurance_provider_id: formData.insurance_provider_id === '' ? null : formData.insurance_provider_id,
        insurance_id: formData.insurance_provider_id === '' ? null : formData.insurance_provider_id, // Redundância
        insurance_card_number: formData.insurance_card_number,
        
        // Obs
        notes: formData.observations, // Form 'observations' -> Banco 'notes'
        
        // Emergência
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone.replace(/\D/g, '') || null,
        emergency_contact_kinship: formData.emergency_contact_kinship,
        
        // Meta dados (para coisas que não tem coluna direta)
        meta: {
            referral_source: formData.referral_source
        }
      };

      let savedPatientId = patientToEdit?.id;

      if (patientToEdit) {
        const { error } = await supabase.from('patients').update(patientPayload).eq('id', patientToEdit.id);
        if (error) throw error;
        setToast({ message: 'Paciente atualizado com sucesso!', type: 'success' });
      } else {
        const { data, error } = await supabase.from('patients').insert([patientPayload]).select().single();
        if (error) throw error;
        savedPatientId = data.id;
        setToast({ message: 'Paciente cadastrado com sucesso!', type: 'success' });
      }

      // Uploads (Com ID Garantido)
      if (savedPatientId) {
          if (profilePhoto) {
              const fileExt = profilePhoto.name.split('.').pop();
              const filePath = `${clinicId}/${savedPatientId}/avatar_${Date.now()}.${fileExt}`;
              await supabase.storage.from('patient-avatars').upload(filePath, profilePhoto, { upsert: true });
              await patientService.updatePatient(savedPatientId, { profile_photo_path: filePath });
          }
          if (insuranceCardFile) {
              const fileExt = insuranceCardFile.name.split('.').pop();
              const filePath = `${clinicId}/${savedPatientId}/docs/carteirinha_${Date.now()}.${fileExt}`;
              await supabase.storage.from('patient-files').upload(filePath, insuranceCardFile);
          }
      }

      // Callbacks
      if (typeof onSuccess === 'function') onSuccess();
      else if (typeof onSave === 'function') onSave();

      setTimeout(() => { onClose(); }, 1500);

    } catch (error) {
      console.error(error);
      setToast({ message: 'Erro ao salvar. Verifique os dados.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in-fast">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {toast && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border z-[110] animate-fade-in-down ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
            <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative z-[101] border border-white/50">
        
        <div className="px-8 py-6 bg-white border-b border-slate-200 flex justify-between items-center shrink-0 relative overflow-hidden">
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <User size={28} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                {patientToEdit ? 'Editar Paciente' : 'Novo Paciente'}
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1 uppercase">Preencha os dados completos.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                    {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <User size={48} className="text-slate-300" />}
                </div>
                <div className="absolute -bottom-2 inset-x-0 flex justify-center gap-2 z-20">
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg active:scale-95"><Camera size={18} /></button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-white text-slate-600 rounded-full hover:bg-slate-50 border border-slate-200 shadow-lg active:scale-95"><Upload size={18} /></button>
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => handlePhotoSelect(e, 'profile')} />
                <input type="file" ref={cameraInputRef} hidden accept="image/*" capture="user" onChange={(e) => handlePhotoSelect(e, 'profile')} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <FormSection title="Dados Pessoais" icon={User} color="blue">
                <div><Label icon={User} text="Nome Completo" required /><input name="name" value={formData.name} onChange={handleInputChange} className={InputClass} placeholder="EX: JOÃO SILVA" autoFocus/></div>
                <div><Label icon={User} text="Nome Social" /><input name="social_name" value={formData.social_name} onChange={handleInputChange} className={InputClass} placeholder="EX: JOÃOZINHO" /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label icon={FileText} text="CPF" /><input name="document" value={formData.document} onChange={handleInputChange} className={InputClass} placeholder="000.000.000-00" maxLength={14}/></div>
                    <div><Label icon={MapPin} text="Data Nasc." /><input type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} className={InputClass} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label icon={User} text="Gênero" /><select name="gender" value={formData.gender} onChange={handleInputChange} className={InputClass}><option value="">SELECIONE...</option><option value="MASCULINO">MASCULINO</option><option value="FEMININO">FEMININO</option><option value="OUTRO">OUTRO</option></select></div>
                    <div><Label icon={User} text="Profissão" /><input name="occupation" value={formData.occupation} onChange={handleInputChange} className={InputClass} placeholder="EX: ADVOGADO" /></div>
                </div>
              </FormSection>
              
              <FormSection title="Contato & Emergência" icon={Phone} color="emerald">
                <div className="grid grid-cols-2 gap-4">
                    <div><Label icon={Phone} text="Celular" required /><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={InputClass} placeholder="(00) 00000-0000"/></div>
                    <div><Label icon={Phone} text="Email" /><input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`${InputClass} normal-case`} placeholder="email@exemplo.com" /></div>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100">
                    <h5 className="text-xs font-bold text-emerald-700 uppercase mb-3 flex items-center gap-1"><HeartPulse size={14}/> Emergência / Responsável</h5>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1"><Label icon={User} text="Nome" /><input name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} className={InputClass} placeholder="NOME" /></div>
                        <div className="col-span-1"><Label icon={Users} text="Parentesco" /><input name="emergency_contact_kinship" value={formData.emergency_contact_kinship} onChange={handleInputChange} className={InputClass} placeholder="EX: MÃE" /></div>
                        <div className="col-span-1"><Label icon={Phone} text="Telefone" /><input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleInputChange} className={InputClass} placeholder="(00) 00000-0000"/></div>
                    </div>
                </div>
              </FormSection>
            </div>

            <div className="space-y-8">
              <FormSection title="Endereço Completo" icon={MapPin} color="violet">
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1"><Label icon={MapPin} text="CEP" /><input name="zip_code" value={formData.zip_code} onChange={handleInputChange} className={InputClass} placeholder="00000-000" maxLength={9} /></div>
                    <div className="col-span-2"><Label icon={MapPin} text="Cidade/UF" /><div className="flex gap-2"><input name="city" value={formData.city} onChange={handleInputChange} className={InputClass} /><input name="state" value={formData.state} onChange={handleInputChange} className={`${InputClass} w-24 text-center`} maxLength={2} /></div></div>
                </div>
                <div><Label icon={MapPin} text="Logradouro" /><input name="address" value={formData.address} onChange={handleInputChange} className={InputClass} /></div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1"><Label icon={MapPin} text="Número" /><input name="address_number" value={formData.address_number} onChange={handleInputChange} className={InputClass} placeholder="Nº" /></div>
                    <div className="col-span-2"><Label icon={MapPin} text="Complemento" /><input name="address_complement" value={formData.address_complement} onChange={handleInputChange} className={InputClass} placeholder="APTO, BLOCO..." /></div>
                </div>
                <div><Label icon={MapPin} text="Bairro" /><input name="neighborhood" value={formData.neighborhood} onChange={handleInputChange} className={InputClass} /></div>
              </FormSection>

              <FormSection title="Convênio & Saúde" icon={ShieldCheck} color="amber">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label icon={ShieldCheck} text="Convênio" />
                    <select name="insurance_provider_id" value={formData.insurance_provider_id || ''} onChange={handleInputChange} className={InputClass}>
                      <option value="">PARTICULAR</option>
                      {insuranceProviders.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                  </div>
                  <div><Label icon={FileText} text="Nº Carteirinha" /><input name="insurance_card_number" value={formData.insurance_card_number} onChange={handleInputChange} className={InputClass} /></div>
                </div>
                
                {(formData.insurance_provider_id || formData.insurance_card_number) && (
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 mb-4">
                      <Label icon={Camera} text="Foto da Carteirinha" />
                      <div className="flex items-center gap-4 mt-2">
                          <div className="w-24 h-16 bg-white border-2 border-dashed border-amber-200 rounded-lg flex items-center justify-center overflow-hidden relative">
                              {insuranceCardPreview ? <img src={insuranceCardPreview} className="w-full h-full object-cover" /> : <ShieldCheck className="text-amber-300" />}
                          </div>
                          <div className="flex gap-2">
                              <button type="button" onClick={() => cardCameraInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-bold text-xs hover:bg-amber-200 active:scale-95"><Camera size={16}/> Câmera</button>
                              <button type="button" onClick={() => cardFileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg font-bold text-xs hover:bg-amber-50 active:scale-95"><Upload size={16}/> Arquivo</button>
                          </div>
                          <input type="file" ref={cardFileInputRef} hidden accept="image/*" onChange={(e) => handlePhotoSelect(e, 'card')} />
                          <input type="file" ref={cardCameraInputRef} hidden accept="image/*" capture="environment" onChange={(e) => handlePhotoSelect(e, 'card')} />
                      </div>
                  </div>
                )}

                <div><Label icon={User} text="Como conheceu?" /><input name="referral_source" value={formData.referral_source} onChange={handleInputChange} className={InputClass} /></div>
                
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <Label icon={FileText} text="Observações Gerais" />
                    <textarea name="observations" value={formData.observations} onChange={handleInputChange} className={`${InputClass} min-h-[80px]`} placeholder="ALERGIAS OU INFO IMPORTANTE..." />
                </div>
              </FormSection>
            </div>
          </div>
        </form>

        <div className="px-8 py-5 bg-white border-t border-slate-200 flex justify-end gap-4 shrink-0 relative z-10">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">Cancelar</button>
          <button type="submit" onClick={handleSubmit} disabled={loading} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            <span>{patientToEdit ? 'Salvar Alterações' : 'Cadastrar Paciente'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};