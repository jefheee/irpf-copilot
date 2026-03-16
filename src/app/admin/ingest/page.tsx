'use client';

import { useState } from 'react';

export default function AdminIngest() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleProcess = async () => {
    if (files.length === 0) return;
    setIsLoading(true);
    setStatus('Iniciando processamento...');

    try {
      for (const file of files) {
        setStatus((prev) => `${prev}\nLendo arquivo: ${file.name}...`);
        
        // Lê o conteúdo do arquivo .txt como texto puro
        const textData = await file.text();

        setStatus((prev) => `${prev}\nVetorizando e enviando ${file.name} para o Supabase. Isso pode demorar alguns minutos...`);
        
        // Envia para a nossa API de ingestão
        const res = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ textData })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

        setStatus((prev) => `${prev}\n✅ Sucesso no arquivo ${file.name}: ${data.message}`);
      }
      setStatus((prev) => `${prev}\n🎉 Todos os arquivos foram processados e salvos no banco vetorial!`);
    } catch (error: any) {
      setStatus((prev) => `${prev}\n❌ Erro: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-10 text-neutral-900">
      <div className="max-w-3xl mx-auto space-y-6 bg-white p-8 border border-neutral-200 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold">Painel Admin: Ingestão de Conhecimento (RAG)</h1>
        <p className="text-neutral-600 text-sm">
          Faça o upload dos seus arquivos <strong>.txt</strong> (Manual da Receita, Perguntas e Respostas).
          O sistema vai fatiar o texto, converter em vetores matemáticos e salvar no Supabase.
        </p>

        <div className="space-y-4">
          <input
            type="file"
            accept=".txt"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="block w-full border border-neutral-300 p-3 rounded-lg bg-neutral-50"
          />

          <button
            onClick={handleProcess}
            disabled={files.length === 0 || isLoading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {isLoading ? 'Processando arquivos...' : 'Vetorizar e Salvar no Supabase'}
          </button>
        </div>

        {status && (
          <div className="mt-6 bg-neutral-900 text-green-400 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}