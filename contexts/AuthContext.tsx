/* src/contexts/AuthContext.tsx */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { UserRole } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  userRole: UserRole | null;
  userName: string | null;
  userAvatar: string | null;
  userSpecialty: string | null;
  clinicId: string | null;
  canGenerateReport: boolean;
  loading: boolean;
  isBlocked: boolean;
  signOut: () => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
    session: null, 
    userRole: null, 
    userName: null,
    userAvatar: null,
    userSpecialty: null,
    clinicId: null,
    canGenerateReport: false,
    loading: true, 
    isBlocked: false,
    signOut: async () => {},
    updateAvatar: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userSpecialty, setUserSpecialty] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [canGenerateReport, setCanGenerateReport] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      // Busca profile usando OR para garantir compatibilidade (id ou auth_user_id)
      const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            specialties ( name )
        `)
        .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        setIsBlocked(true);
        return;
      }

      if (!data) {
        console.warn('Perfil não encontrado para o usuário:', userId);
        setIsBlocked(true);
        return;
      }

      // Se não tem clínica vinculada -> Bloqueia
      if (!data.clinic_id) {
        console.warn('Usuário sem clínica vinculada.');
        setIsBlocked(true);
        return;
      }

      setClinicId(data.clinic_id);
      setUserName(data.name || 'Usuário');
      setUserAvatar(data.avatar_url || null);
      
      const specialtyName = data.specialties ? (Array.isArray(data.specialties) ? data.specialties[0]?.name : data.specialties.name) : null;
      setUserSpecialty(specialtyName);

      setCanGenerateReport(!!data.can_generate_integrated_report);
      setIsBlocked(false);

      // --- CORREÇÃO DE ROLE (Admin vs Reception) ---
      
      // 1. Normaliza a string vinda do banco (remove espaços e força minúsculo)
      const rawRole = (data.role || '').toLowerCase().trim();
      
      console.log(`[AUTH] Role Original: "${data.role}" | Normalizada: "${rawRole}"`);

      const roleMap: Record<string, UserRole> = {
        'manager': UserRole.MANAGER,
        'admin': UserRole.MANAGER,        // Admin mapeia para Manager
        'administrator': UserRole.MANAGER,
        'gestor': UserRole.MANAGER,
        
        'therapist': UserRole.PROFESSIONAL,
        'professional': UserRole.PROFESSIONAL, 
        'doctor': UserRole.PROFESSIONAL,
        'medico': UserRole.PROFESSIONAL,
        
        'receptionist': UserRole.RECEPTION,
        'reception': UserRole.RECEPTION,
        'recepcao': UserRole.RECEPTION,
        
        'patient': UserRole.PATIENT
      };

      const mappedRole = roleMap[rawRole] || UserRole.RECEPTION;
      
      console.log(`[AUTH] Acesso Concedido: ${mappedRole}`);
      setUserRole(mappedRole);
      
    } catch (error) {
      console.error('Erro fatal no fetchProfile:', error);
      setIsBlocked(true);
    } finally {
      setLoading(false);
    }
  };

  const updateAvatar = async (file: File) => {
    if (!session) return;

    try {
        const userId = session.user.id;
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`; 
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
            .from('profile-avatars') // Bucket de perfis (diferente de pacientes)
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('profile-avatars')
            .getPublicUrl(filePath);

        // Atualiza profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .or(`id.eq.${userId},auth_user_id.eq.${userId}`);

        if (updateError) throw updateError;

        setUserAvatar(publicUrl);

    } catch (error) {
        console.error('Erro ao atualizar avatar:', error);
        throw error; 
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setLoading(true);
        fetchProfile(session.user.id);
      } else {
        setUserRole(null);
        setUserName(null);
        setUserAvatar(null);
        setUserSpecialty(null);
        setClinicId(null);
        setCanGenerateReport(false);
        setIsBlocked(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
        session, 
        userRole, 
        userName, 
        userAvatar, 
        userSpecialty, 
        clinicId, 
        canGenerateReport, 
        loading, 
        isBlocked, 
        signOut, 
        updateAvatar 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);