'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Erro ao processar o documento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col items-center justify-center p-6 selection:bg-neutral-900 selection:text-white">
      <div className="max-w-2xl w-full space-y-8">
        
        <header className="space-y-2">
          <h1 className="text-3xl font-medium tracking-tight">IRPF Copilot</h1>
          <p className="text-neutral-500">Extração estruturada de informes e recibos para o Programa Gerador da Declaração.</p>
        </header>

        {/* Quadro de Segurança */}
        <div className="border border-neutral-200 bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-neutral-100 rounded-md">
              <svg className="w-5 h-5 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">Privacidade Criptográfica & Retenção Zero</h3>
              <p className="text-sm text-neutral-500 mt-1">
                Seus documentos não são salvos em nenhum banco de dados. Eles são processados em memória RAM (buffer) e destruídos imediatamente após a extração dos dados JSON.
              </p>
            </div>
          </div>
        </div>

        {/* Área de Upload */}
        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-10 text-center hover:bg-neutral-100 transition-colors duration-300 ease-in-out">
          <input 
            type="file" 
            id="file-upload" 
            className="hidden" 
            onChange={handleFileChange}
            accept="image/*,application/pdf"
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-3">
            <span className="text-neutral-600 font-medium">
              {file ? file.name : 'Clique para anexar um documento ou arraste aqui'}
            </span>
            <span className="text-xs text-neutral-400">Suporta PDF, JPG e PNG</span>
          </label>
        </div>

        <button 
          onClick={handleUpload}
          disabled={!file || loading}
          className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-all duration-300"
        >
          {loading ? 'Extraindo dados...' : 'Processar Documento'}
        </button>

        {/* Resultado */}
        {result && (
          <div className="animate-fade-in pt-6">
            <h3 className="font-medium mb-3 border-b border-neutral-200 pb-2">Resultado da Extração</h3>
            <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-lg overflow-x-auto text-sm shadow-inner">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}