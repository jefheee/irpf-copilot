'use client';

import { useState } from 'react';
import ChatPanel from '../components/ChatPanel';
import DocumentUploader from '../components/DocumentUploader';
import FinancialWhiteboard from '../components/FinancialWhiteboard';
import { UniversalDocument } from '../types/finance';

export default function Home() {
  const [extractedData, setExtractedData] = useState<UniversalDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDocumentSuccess = (doc: UniversalDocument) => {
    // Elevando o Estado: Anexando cada nova extração imediatamente no fim da fila atual.
    setExtractedData(prev => [...prev, doc]);
  };

  return (
    <main className="flex w-full h-screen bg-white overflow-hidden text-zinc-950 font-sans">
      
      {/* Lado Esquerdo: Chat (40%) */}
      <div className="w-full md:w-[40%] h-full flex-shrink-0">
        <ChatPanel extractedData={extractedData} />
      </div>

      {/* Lado Direito: Whiteboard (60%) */}
      <div className="hidden md:flex w-[60%] h-full flex-col bg-white border-l border-zinc-200 shadow-[-20px_0_40px_rgba(0,0,0,0.02)] z-10 relative">
        
        {/* Header Superior - Uploader Progressivo */}
        <div className="flex-shrink-0 bg-white z-20">
          <DocumentUploader onProcessing={setIsProcessing} onSuccess={handleDocumentSuccess} />
        </div>

        {/* Quadro Financeiro Renderizado Dinamicamente */}
        {extractedData.length > 0 ? (
          <FinancialWhiteboard data={extractedData} />
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center opacity-80 mt-[-6rem]">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center animate-pulse">
                <svg className="w-12 h-12 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-4xl font-black tracking-tighter text-zinc-800">
                Aguardando Motor Omnívoro
              </h2>
              <p className="text-zinc-500 font-medium max-w-md mx-auto tracking-tight leading-relaxed">
                Arraste declarações, notas ou recibos acima. O Cérebro 2 baseará as análises nos metadados validados.
              </p>
            </div>
          </div>
        )}

      </div>
      
    </main>
  );
}