'use client';

import { useState, useCallback } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { UniversalDocument } from '../types/finance';

interface DocumentUploaderProps {
  onProcessing: (isProcessing: boolean) => void;
  onSuccess: (document: UniversalDocument) => void;
  isExpanded?: boolean;
}

export default function DocumentUploader({ onProcessing, onSuccess, isExpanded = false }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);

  const processQueue = async (files: File[]) => {
    onProcessing(true);
    let current = 1;
    const total = files.length;

    for (const file of files) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setQueueStatus(`A saltar: ${file.name} não é um formato suportado.`);
        await new Promise(r => setTimeout(r, 1500));
        current++;
        continue;
      }

      setQueueStatus(`Processando documento ${current} de ${total}...`);

      const formData = new FormData();
      formData.append('document', file);

      let success = false;
      while (!success) {
        try {
          const response = await fetch('/api/extract', {
            method: 'POST',
            body: formData,
          });

          if (response.status === 429) {
            setQueueStatus('Limite da IA atingido. Pausando por 40 segundos para arrefecer a rede...');
            await new Promise(r => setTimeout(r, 40000));
            setQueueStatus(`Retomando documento ${current} de ${total}...`);
            continue;
          }

          if (!response.ok) {
            throw new Error('Falha na extração');
          }

          const data: UniversalDocument = await response.json();
          onSuccess(data);
          success = true;

        } catch (error) {
          console.error(`Erro ao processar ${file.name}:`, error);
          setQueueStatus(`Erro no documento ${current}. A avançar...`);
          await new Promise(r => setTimeout(r, 2000));
          success = true; // Força avanço pro próximo doc
        }
      }

      current++;
    }

    setQueueStatus('Processamento concluído!');
    setTimeout(() => {
      setQueueStatus(null);
      onProcessing(false);
    }, 2000);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
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
    <div
      className={`w-full transition-all duration-700 ease-in-out flex flex-col justify-center ${
        isExpanded ? 'flex-1 p-8 h-full' : 'p-6 md:h-[250px]'
      }`}
    >
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-[3px] border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all duration-700 ease-in-out relative w-full h-full cursor-pointer group overflow-hidden
          ${isDragging
            ? 'border-blue-500/50 bg-[#151518] scale-[1.01]'
            : 'border-zinc-800/60 hover:border-zinc-700 bg-[#121214]/50 hover:bg-[#121214]/80'
          }
          ${isExpanded ? 'p-12' : 'p-8'}
        `}
      >
        <input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/jpg" className="hidden" onChange={onFileSelect} />
        
        {queueStatus && (
          <div className="absolute inset-0 bg-[#0c0c0e]/90 backdrop-blur-md flex flex-col items-center justify-center z-10 transition-opacity duration-500">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
            <p className="text-zinc-100 font-bold tracking-tight text-xl font-sans text-center px-4">
              {queueStatus}
            </p>
          </div>
        )}

        <div className={`transition-all duration-700 ease-in-out flex flex-col items-center justify-center ${isExpanded ? 'scale-125' : 'scale-100'}`}>
          <UploadCloud className={`transition-colors duration-300 mb-6 group-hover:scale-110 ${isExpanded ? 'w-24 h-24' : 'w-12 h-12'} ${isDragging ? 'text-blue-500' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
          <h3 className={`font-black tracking-tighter text-center transition-all duration-700 text-zinc-100 ${isExpanded ? 'text-5xl mb-6' : 'text-xl mb-2'}`}>
            Arraste Documentos Fiscais ou Financeiros
          </h3>
          <p className={`text-zinc-500 font-medium text-center transition-all duration-700 ${isExpanded ? 'text-xl mb-12 max-w-2xl' : 'text-sm mb-6 max-w-md'}`}>
            Suporte: PDF, JPEG, PNG. O Motor Omnívoro extrai recibos, notas da B3 ou a declaração do ano passado.
          </p>

          <span className="bg-zinc-100 text-zinc-950 px-10 py-4 rounded-full font-black text-sm tracking-widest transition-all duration-300 shadow-2xl shadow-white/5 uppercase group-hover:bg-white group-hover:scale-105 active:scale-95">
            Selecionar Ficheiros
          </span>
        </div>
      </label>
    </div>
  );
}
