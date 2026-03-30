'use client';

import { useState, useCallback } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { BrokerageNote } from '../types/finance';

interface B3UploaderProps {
  onProcessing: (isProcessing: boolean) => void;
  onSuccess: (note: BrokerageNote) => void;
}

export default function B3Uploader({ onProcessing, onSuccess }: B3UploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);

  const processQueue = async (files: File[]) => {
    onProcessing(true);
    let current = 1;
    const total = files.length;

    for (const file of files) {
      if (file.type !== 'application/pdf') {
        setQueueStatus(`A saltar: ${file.name} não é um PDF válido.`);
        await new Promise(r => setTimeout(r, 1500));
        current++;
        continue;
      }

      setQueueStatus(`Processando nota ${current} de ${total}...`);
      
      const formData = new FormData();
      formData.append('document', file);

      try {
         // Estratégia Anti-Timeout: Awaiting single file
        const response = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Falha na extração');
        }

        const data: BrokerageNote = await response.json();
        onSuccess(data);

      } catch (error) {
         console.error(`Erro ao processar ${file.name}:`, error);
         setQueueStatus(`Erro na nota ${current}. A avançar...`);
         await new Promise(r => setTimeout(r, 2000));
      }
      
      current++;
    }

    setQueueStatus('Todas as notas processadas!');
    setTimeout(() => {
      setQueueStatus(null);
      onProcessing(false);
    }, 2000);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      processQueue(filesArray);
    }
  }, []);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
       const filesArray = Array.from(e.target.files);
       processQueue(filesArray);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto my-6 px-4 pt-4">
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-[3px] border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden
          ${isDragging 
            ? 'border-zinc-800 bg-zinc-50' 
            : 'border-zinc-200 hover:border-zinc-400 bg-white'
          }`}
      >
        {queueStatus && (
           <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-opacity duration-300">
             <Loader2 className="w-10 h-10 text-zinc-900 animate-spin mb-4" />
             <p className="text-zinc-800 font-bold tracking-tight text-lg font-sans text-center px-4">
               {queueStatus}
             </p>
           </div>
        )}

        <UploadCloud className={`w-12 h-12 mb-4 ${isDragging ? 'text-zinc-900' : 'text-zinc-300'}`} />
        <h3 className="text-xl font-black text-zinc-900 tracking-tighter mb-2 text-center">
          Arraste Notas de Corretagem (B3)
        </h3>
        <p className="text-zinc-500 font-medium text-sm text-center mb-6">
          Solte múltiplos PDFs. A arquitetura extrai cada nota sequencialmente para evitar falhas do lado do LLM.
        </p>
        
        <label className="bg-zinc-900 text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:bg-zinc-800 transition-colors cursor-pointer shadow-xl shadow-zinc-900/10 active:scale-95">
          SELECIONAR FICHEIROS
          <input type="file" multiple accept="application/pdf" className="hidden" onChange={onFileSelect} />
        </label>
      </div>
    </div>
  );
}
