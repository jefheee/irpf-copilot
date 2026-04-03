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
      <div className="hidden md:flex w-[60%] h-full flex-col bg-[#0c0c0e] border-l border-zinc-800/60 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-10 relative overflow-hidden transition-all duration-700">
        
        {/* Uploader Omnipresente (Ocupa 100% da área) */}
        <div className="flex-1 flex flex-col w-full h-full bg-[#0c0c0e]/80 backdrop-blur-xl z-20 transition-all duration-700">
          <DocumentUploader
            onProcessing={setIsProcessing}
            onSuccess={handleDocumentSuccess}
            isExpanded={extractedData.length === 0}
          >
            {/* Quadro Financeiro injetado direitamente no interior do limite pontilhado */}
            {extractedData.length > 0 && (
              <FinancialWhiteboard data={extractedData} />
            )}
          </DocumentUploader>
        </div>

      </div>

    </main>
  );
}