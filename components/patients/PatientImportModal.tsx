/* src/components/patients/PatientImportModal.tsx */
import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Save } from 'lucide-react';
import * as XLSX from 'xlsx'; 
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SYSTEM_FIELDS = [
  { key: 'name', label: 'Nome Completo *', required: true },
  { key: 'social_name', label: 'Nome Social', required: false },
  { key: 'cpf', label: 'CPF', required: false },
  { key: 'rg', label: 'RG', required: false },
  { key: 'birth_date', label: 'Data de Nascimento', required: false },
  { key: 'phone', label: 'Celular / WhatsApp', required: false },
  { key: 'email', label: 'E-mail', required: false },
  { key: 'insurance_card_number', label: 'Nº Carteirinha', required: false },
  { key: 'notes', label: 'Observações', required: false },
];

export const PatientImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { clinicId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileData, setFileData] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ processed: number; success: boolean } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      if (data.length > 0) {
        const headers = data[0] as string[];
        const rows = XLSX.utils.sheet_to_json(ws); 
        
        setFileHeaders(headers);
        setFileData(rows);
        setFileName(file.name);
        
        const initialMap: Record<string, string> = {};
        SYSTEM_FIELDS.forEach(field => {
          const match = headers.find(h => 
            h.toLowerCase().includes(field.label.toLowerCase()) || 
            h.toLowerCase() === field.key
          );
          if (match) initialMap[field.key] = match;
        });
        setColumnMapping(initialMap);
        setStep(2);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const payload = fileData.map(row => {
        const patientObj: any = {};
        Object.entries(columnMapping).forEach(([sysField, sheetHeader]) => {
          if (sheetHeader) {
            patientObj[sysField] = row[sheetHeader];
          }
        });
        return patientObj;
      });

      const BATCH_SIZE = 100;
      let totalProcessed = 0;

      for (let i = 0; i < payload.length; i += BATCH_SIZE) {
        const batch = payload.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.rpc('import_patients_batch', {
          p_clinic_id: clinicId,
          p_patients: batch
        });
        if (error) throw error;
        totalProcessed += batch.length;
      }

      setImportResult({ success: true, processed: totalProcessed });
      setStep(3);
    } catch (err) {
      alert("Erro na importação: " + err);
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFileData([]);
    setFileName('');
    setImportResult(null);
    setImporting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="text-green-600" size={20}/>
              Importação em Massa
            </h3>
            <p className="text-xs text-slate-500">Adicione múltiplos pacientes via Excel ou CSV</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {step === 1 && (
            <div className="text-center py-10">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>
                <h4 className="font-bold text-slate-700 text-lg">Clique para selecionar o arquivo</h4>
                <p className="text-sm text-slate-400 mt-2">Suporta .XLSX ou .CSV</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload}
                />
              </div>
              <div className="mt-8 bg-amber-50 text-amber-800 p-4 rounded-lg text-sm text-left flex gap-3 items-start border border-amber-100">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção:</strong> O sistema usará o <strong>CPF</strong> para identificar duplicatas. 
                  Se o CPF já existir, os dados serão atualizados.
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="text-sm font-bold text-slate-700">
                  Arquivo: <span className="text-blue-600">{fileName}</span>
                </div>
                <div className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">
                  {fileData.length} linhas encontradas
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 uppercase">
                  <div>Campo do Sistema</div>
                  <div>Coluna do Arquivo</div>
                </div>
                {SYSTEM_FIELDS.map((field) => (
                  <div key={field.key} className="grid grid-cols-2 gap-4 items-center px-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </div>
                    <select 
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                      value={columnMapping[field.key] || ''}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                    >
                      <option value="">-- Ignorar --</option>
                      {fileHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && importResult && (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Sucesso!</h2>
              <p className="text-slate-500 mb-8">
                Processamos <strong>{importResult.processed}</strong> pacientes.
              </p>
              <button 
                onClick={() => { onSuccess(); onClose(); }}
                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Concluir
              </button>
            </div>
          )}
        </div>

        {step === 2 && (
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between">
            <button onClick={handleReset} className="px-6 py-2 text-slate-500 font-bold hover:text-slate-700">
              Voltar
            </button>
            <button 
              onClick={handleImport}
              disabled={importing || !columnMapping['name']}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? <><Loader2 className="animate-spin" size={18}/> Processando...</> : <><Save size={18}/> Iniciar Importação</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};