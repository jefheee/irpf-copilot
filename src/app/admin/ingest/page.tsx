'use client';

import { useState, useEffect } from 'react';

function chunkText(text: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  const paragraphs = text.split(/\r?\n/);

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    
    if ((currentChunk.length + trimmed.length) < chunkSize) {
      currentChunk += trimmed + '\n\n';
    } else {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = trimmed + '\n\n';
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

export default function AdminIngest() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleProcess = async () => {
    if (files.length === 0) return;
    setIsLoading(true);
    setStatus('Iniciando processamento...');

    try {
      for (const file of files) {
        setStatus((prev) => `${prev}\nLendo arquivo: ${file.name}...`);
        const textData = await file.text();
        
        const chunks = chunkText(textData, 1500);

        setStatus((prev) => `${prev}\nO arquivo foi dividido em ${chunks.length} blocos. Iniciando envio seguro...`);

        for (let i = 0; i < chunks.length; i++) {
          setStatus((prev) => {
            const lines = prev.split('\n');
            if (lines[lines.length - 1].startsWith('Enviando bloco')) lines.pop();
            return lines.join('\n') + `\nEnviando bloco ${i + 1} de ${chunks.length}...`;
          });

          let retries = 3;
          let success = false;

          while (retries > 0 && !success) {
            try {
              const res = await fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chunk: chunks[i] })
              });

              if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Erro desconhecido');
              }
              success = true;
            } catch (err: any) {
              retries--;
              if (retries === 0) {
                throw new Error(`\nFALHA CRÍTICA no bloco ${i + 1}: ${err.message}`);
              }
              setStatus((prev) => `${prev}\n⚠️ Erro detetado: ${err.message}. A pausar 15 segundos para arrefecer a API...`);
              await new Promise(resolve => setTimeout(resolve, 15000));
            }
          }

          await new Promise(resolve => setTimeout(resolve, 4200));
        }

        setStatus((prev) => `${prev}\n✅ Sucesso absoluto no arquivo ${file.name}!`);
      }
      setStatus((prev) => `${prev}\n🎉 Todos os arquivos foram vetorizados e salvos no Supabase!`);
    } catch (error: any) {
      setStatus((prev) => `${prev}\n❌ O Processo Parou: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-neutral-50 dark:bg-zinc-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-300">
      
      {/* HEADER PADRONIZADO */}
      <header className="flex justify-between items-center px-6 py-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-neutral-200/80 dark:border-zinc-800/80 sticky top-0 z-50 transition-colors duration-300">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-blue-600 to-blue-500 p-1.5 rounded-lg shadow-sm shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
            IRPF Copilot <span className="text-sm font-medium text-neutral-400 dark:text-zinc-500 ml-2">Admin</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-all"
          >
            {isDarkMode ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-4xl mx-auto">
        <div className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl shadow-xl p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Ingestão de Conhecimento RAG</h2>
            <p className="text-neutral-500 dark:text-zinc-400 text-sm">
              Faça o upload dos seus arquivos <strong>.txt</strong>. O sistema enviará pedaço por pedaço
              para a base vetorial do Supabase com pausas de segurança.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-neutral-300 dark:border-zinc-700 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                id="rag-upload"
                accept=".txt"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="hidden"
              />
              <label htmlFor="rag-upload" className="cursor-pointer w-full flex flex-col items-center">
                <div className="p-3 rounded-full mb-3 bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </div>
                <span className="font-semibold text-sm text-neutral-800 dark:text-zinc-200">
                  {files.length > 0 ? `${files.length} Ficheiro(s) Selecionado(s)` : 'Anexar Base de Conhecimento (.txt)'}
                </span>
              </label>
            </div>

            <button
              onClick={handleProcess}
              disabled={files.length === 0 || isLoading}
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold text-lg disabled:opacity-50 hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 shadow-md"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processando Base...
                </>
              ) : 'Vetorizar e Salvar'}
            </button>
          </div>

          {status && (
            <div className="mt-6 bg-zinc-950 dark:bg-black text-green-400 border border-zinc-800 p-4 rounded-xl text-sm font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar shadow-inner">
              {status}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}