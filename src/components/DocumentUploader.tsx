'use client';

import { useState, useCallback } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { UniversalDocument } from '../types/finance';

import { ReactNode } from 'react';

interface DocumentUploaderProps {
  onProcessing: (isProcessing: boolean) => void;
  onSuccess: (document: UniversalDocument) => void;
  isExpanded?: boolean;
  children?: ReactNode;
}

export default function DocumentUploader({ onProcessing, onSuccess, isExpanded = false, children }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);

  const processQueue = async (files: File[]) => {
    // ... logic remains standard, I'll rewrite the layout logic below
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
    <div className="w-full h-full flex-1 flex flex-col p-4 transition-all duration-700 ease-in-out">
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-[3px] border-dashed rounded-[2.5rem] flex flex-col items-center transition-all duration-700 ease-in-out relative w-full h-full cursor-pointer group overflow-hidden
          ${isDragging
            ? 'border-zinc-500 bg-[#151518]'
            : 'border-zinc-800/60 hover:border-zinc-700 bg-[#0c0c0e]/80 hover:bg-[#121214]'
          }
        `}
      >
        <input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/jpg" className="hidden" onChange={onFileSelect} />

        {queueStatus && (
          <div className="absolute inset-0 bg-[#0c0c0e]/95 backdrop-blur-md flex flex-col items-center justify-center z-50 transition-opacity duration-500">
            <Loader2 className="w-12 h-12 text-zinc-300 animate-spin mb-6" />
            <p className="text-zinc-100 font-bold tracking-tight text-xl font-sans text-center px-4">
              {queueStatus}
            </p>
          </div>
        )}

        <div className={`w-full flex-1 flex flex-col items-center transition-all duration-700 ease-in-out ${isExpanded ? 'justify-center p-8' : 'justify-start pt-12'}`}>
          <div className={`flex flex-col items-center justify-center w-full max-w-4xl transition-all duration-700 ease-in-out ${isExpanded ? '' : 'mb-8'}`}>
            <UploadCloud className={`transition-colors duration-300 group-hover:scale-110 ${isExpanded ? 'w-24 h-24 mb-6' : 'w-10 h-10 mb-4'} ${isDragging ? 'text-zinc-300' : 'text-zinc-700 group-hover:text-zinc-500'}`} />
            <h3 className={`font-black tracking-tighter text-center transition-all duration-700 text-zinc-100 ${isExpanded ? 'text-4xl md:text-5xl mb-4' : 'text-lg md:text-xl mb-1'}`}>
              Arraste Documentos Fiscais ou Financeiros
            </h3>
            <p className={`text-zinc-500 font-medium text-center mx-auto transition-all duration-700 ${isExpanded ? 'text-lg md:text-xl mb-12 max-w-2xl' : 'text-xs mb-4 max-w-md'}`}>
              Suporte: PDF, JPEG, PNG. O Motor Omnívoro extrai recibos, notas da B3 ou a declaração do ano passado.
            </p>

            <span className={`bg-zinc-100 text-zinc-950 rounded-full font-black tracking-widest transition-all duration-300 shadow-2xl shadow-white/5 uppercase group-hover:bg-white group-hover:scale-105 active:scale-95 ${isExpanded ? 'px-10 py-4 text-sm' : 'px-6 py-2 text-[10px]'}`}>
              Selecionar Ficheiros
            </span>
          </div>

          {!isExpanded && children && (
            <div className="w-full h-full flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>{/* Stop propagation to avoid opening file dialong when clicking on children elements */}
              {children}
            </div>
          )}
        </div>
      </label>
    </div>
  );
}
