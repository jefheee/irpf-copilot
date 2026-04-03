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
    <main className="flex w-full h-screen bg-[#0c0c0e] text-zinc-100 overflow-hidden font-sans">

      {/* Lado Esquerdo: Chat (40%) */}
      <div className="w-full md:w-[40%] h-full flex-shrink-0">
        <ChatPanel extractedData={extractedData} />
      </div>

      {/* Lado Direito: Whiteboard (60%) */}
      <div className="hidden md:flex w-[60%] h-full flex-col bg-[#0c0c0e] border-l border-zinc-800/60 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-10 relative overflow-y-auto overflow-x-hidden transition-all duration-700">

        {/* Header Superior - Uploader Progressivo */}
        <div className={`transition-all duration-700 bg-[#0c0c0e]/80 backdrop-blur-xl z-20 sticky top-0 ${extractedData.length === 0 ? 'flex-1 flex flex-col' : 'flex-shrink-0'}`}>
          <DocumentUploader
            onProcessing={setIsProcessing}
            onSuccess={handleDocumentSuccess}
            isExpanded={extractedData.length === 0}
          />
        </div>

        {/* Quadro Financeiro Renderizado Dinamicamente */}
        <div className={`transition-all duration-700 ease-in-out transform ${extractedData.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 hidden'}`}>
          {extractedData.length > 0 && (
            <FinancialWhiteboard data={extractedData} />
          )}
        </div>

      </div>

    </main>
  );
}