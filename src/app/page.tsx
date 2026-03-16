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
      
      const dataArray = Array.isArray(data) ? data : [];
      setResult(dataArray);

    } catch (error) {
      console.error(error);
      alert("Erro ao processar os documentos.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error("Falha ao copiar", err);
      alert("O seu navegador bloqueou a cópia automática.");
    }
  };

  const formatLabel = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleClear = () => {
    setFiles([]);
    setResult(null);
    setCopiedKey(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col items-center py-12 px-6 selection:bg-neutral-900 selection:text-white">
      <div className="max-w-3xl w-full space-y-8">
        
        <header className="space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-medium tracking-tight">IRPF Copilot</h1>
          <p className="text-neutral-500">Extração estruturada de informes e recibos para o Programa Gerador da Declaração.</p>
        </header>

        <div className="border border-neutral-200 bg-white p-5 rounded-lg shadow-sm flex items-start space-x-4">
          <div className="p-2 bg-neutral-100 rounded-md shrink-0">
            <svg className="w-5 h-5 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <div>
            <h3 className="font-medium text-sm">Privacidade Criptográfica & Retenção Zero</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Os seus documentos são processados em memória RAM e destruídos imediatamente após a extração. Nada é guardado em base de dados.
            </p>
          </div>
        </div>

        {!result && (
          <>
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
                  {files.length > 0 ? `${files.length} ficheiro(s) selecionado(s)` : 'Clique para anexar ou arraste os seus PDFs/Imagens'}
                </span>
              </label>
            </div>

            <button 
              onClick={handleUpload}
              disabled={files.length === 0 || loading}
              className="w-full bg-neutral-900 text-white py-3.5 rounded-lg font-medium hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed transition-all shadow-sm flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  A analisar documentos...
                </>
              ) : 'Processar Documentos'}
            </button>
          </>
        )}

        {result && result.length === 0 && (
          <div className="animate-fade-in bg-red-50 border border-red-200 p-6 rounded-xl text-center space-y-4">
            <div className="text-red-600 mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h3 className="text-red-800 font-medium">Nenhum dado fiscal encontrado</h3>
              <p className="text-sm text-red-600 mt-1">Os documentos enviados não parecem ser recibos ou informes válidos para o IRPF.</p>
            </div>
            <button onClick={handleClear} className="mt-4 text-sm font-medium text-red-700 hover:text-red-900 border border-red-300 bg-white px-4 py-2 rounded-lg transition-colors">
              Tentar novamente
            </button>
          </div>
        )}

        {result && result.length > 0 && (
          <div className="pt-2 space-y-6 animate-fade-in">
            <div className="flex justify-between items-end border-b border-neutral-200 pb-2">
              <h2 className="text-xl font-medium text-neutral-900">Dados Extraídos</h2>
              <button onClick={handleClear} className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Nova Extração
              </button>
            </div>
            
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
                            className="text-neutral-400 hover:text-neutral-900 transition-colors p-2 bg-neutral-50 rounded-md shrink-0 flex items-center justify-center"
                            title="Copiar valor"
                          >
                            {copiedKey === `${index}-${key}` ? (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
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