import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase'; // Ajuste o caminho conforme sua estrutura real

export function useClinicId() {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveClinicId = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          setLoading(false);
          return;
        }

        // 1. Tenta Cache (Metadata) - Rápido
        const metaClinicId = session.user.user_metadata?.clinic_id;
        if (metaClinicId) {
          setClinicId(metaClinicId);
          setLoading(false);
          return;
        }

        // 2. Fallback Seguro (Banco de Dados) - Confiável
        // Nota: Usando 'profiles_v' ou 'profiles' conforme seu contrato de leitura
        const { data, error } = await supabase
          .from('profiles_v') 
          .select('clinic_id')
          .eq('id', session.user.id)
          .single();

        if (error || !data) {
          console.error('Erro crítico: Não foi possível resolver a clínica do usuário.', error);
          setLoading(false);
          return;
        }

        setClinicId(data.clinic_id);
      } catch (err) {
        console.error('Erro inesperado na resolução de auth:', err);
      } finally {
        setLoading(false);
      }
    };

    resolveClinicId();
  }, []);

  return { clinicId, loading };
}