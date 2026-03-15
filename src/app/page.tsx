'use client';

import { useState } from 'react';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[] | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setResult(null);
    
    const formData = new FormData();
    files.forEach((file) => formData.append('documents', file));

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      // Validação caso a IA devolva um objeto único em vez de array
      const dataArray = Array.isArray(data) ? data : data.declaracao ? Object.values(data.declaracao).flat() : [data];
      setResult(dataArray);

    } catch (error) {
      console.error(error);
      alert("Erro ao processar os documentos.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Função para formatar as chaves (ex: "rendimentos_recebidos" -> "Rendimentos Recebidos")
  const formatLabel = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col items-center py-12 px-6 selection:bg-neutral-900 selection:text-white">
      <div className="max-w-3xl w-full space-y-8">
        
        <header className="space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-medium tracking-tight">IRPF Copilot</h1>
          <p className="text-neutral-500">Extração estruturada de informes e recibos para o Programa Gerador da Declaração.</p>
        </header>

        {/* Quadro de Segurança */}
        <div className="border border-neutral-200 bg-white p-5 rounded-lg shadow-sm flex items-start space-x-4">
          <div className="p-2 bg-neutral-100 rounded-md shrink-0">
            <svg className="w-5 h-5 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-sm">Privacidade Criptográfica & Retenção Zero</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Seus documentos são processados em memória RAM e destruídos imediatamente após a extração. Nada é salvo em banco de dados.
            </p>
          </div>
        </div>

        {/* Área de Upload */}
        <div className="border-2 border-dashed border-neutral-300 bg-white rounded-lg p-10 text-center hover:border-neutral-400 transition-colors duration-300">
          <input 
            type="file" 
            id="file-upload" 
            className="hidden" 
            onChange={handleFileChange}
            accept="image/*,application/pdf"
            multiple 
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-3">
            <div className="bg-neutral-100 p-3 rounded-full mb-2">
              <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </div>
            <span className="text-neutral-700 font-medium">
              {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : 'Clique para anexar ou arraste seus PDFs/Imagens'}
            </span>
          </label>
        </div>

        <button 
          onClick={handleUpload}
          disabled={files.length === 0 || loading}
          className="w-full bg-neutral-900 text-white py-3.5 rounded-lg font-medium hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {loading ? 'Analisando documentos...' : 'Processar Documentos'}
        </button>

        {/* Resultado Renderizado em Cards */}
        {result && (
          <div className="pt-8 space-y-6 animate-fade-in">
            <h2 className="text-xl font-medium border-b border-neutral-200 pb-2">Dados Extraídos</h2>
            
            {result.map((item, index) => (
              <div key={index} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
                  <h3 className="font-medium text-neutral-800">{item.ficha || "Ficha Identificada"}</h3>
                </div>
                
                <div className="p-5 space-y-4">
                  {item.dados && Object.entries(item.dados).map(([key, value]) => {
                    const stringValue = String(value);
                    const isLongText = stringValue.length > 50;
                    
                    return (
                      <div key={key} className={`flex ${isLongText ? 'flex-col space-y-2' : 'flex-col sm:flex-row sm:justify-between sm:items-center'} pb-3 border-b border-neutral-100 last:border-0 last:pb-0`}>
                        <span className="text-sm text-neutral-500 font-medium">
                          {formatLabel(key)}
                        </span>
                        
                        <div className={`flex items-start ${isLongText ? 'w-full' : 'sm:max-w-[60%]'} space-x-3`}>
                          <div className={`text-sm text-neutral-900 bg-neutral-50 px-3 py-2 rounded-md font-mono ${isLongText ? 'w-full text-justify' : ''} break-words`}>
                            {stringValue}
                          </div>
                          
                          <button 
                            onClick={() => copyToClipboard(stringValue, `${index}-${key}`)}
                            className="text-neutral-400 hover:text-neutral-900 transition-colors p-2 bg-neutral-50 rounded-md shrink-0"
                            title="Copiar valor"
                          >
                            {copiedKey === `${index}-${key}` ? (
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}