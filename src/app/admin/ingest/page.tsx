'use client';

import { useState } from 'react';

// Função movida para o front-end para fatiar o texto
function chunkText(text: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  const paragraphs = text.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    if ((currentChunk.length + paragraph.length) < chunkSize) {
      currentChunk += paragraph + '\n\n';
    } else {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = paragraph + '\n\n';
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

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
        const textData = await file.text();
        
        // Fatia o arquivo gigante em blocos de 1500 caracteres
        const chunks = chunkText(textData, 1500);

        setStatus((prev) => `${prev}\nO arquivo foi dividido em ${chunks.length} blocos. Iniciando envio para a IA...`);

        // Loop seguro que respeita Rate Limits (limites de taxa)
        for (let i = 0; i < chunks.length; i++) {
          
          // Atualiza o terminal da tela sem poluir infinitamente
          setStatus((prev) => {
            const lines = prev.split('\n');
            if (lines[lines.length - 1].startsWith('Enviando bloco')) lines.pop();
            return lines.join('\n') + `\nEnviando bloco ${i + 1} de ${chunks.length}...`;
          });

          const res = await fetch('/api/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chunk: chunks[i] })
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(`Falha no bloco ${i + 1}: ${errData.error}`);
          }

          // Pausa de 400ms para a API do Google respirar
          await new Promise(resolve => setTimeout(resolve, 400));
        }

        setStatus((prev) => `${prev}\n✅ Sucesso absoluto no arquivo ${file.name}!`);
      }
      setStatus((prev) => `${prev}\n🎉 Todos os arquivos foram vetorizados e salvos no Supabase! O seu RAG está pronto.`);
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
          Faça o upload dos seus arquivos <strong>.txt</strong>. O sistema vai enviar pedaço por pedaço
          para evitar sobrecarga nos servidores do Google.
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
            {isLoading ? 'Processando e Vetorizando...' : 'Vetorizar e Salvar no Supabase'}
          </button>
        </div>

        {status && (
          <div className="mt-6 bg-neutral-900 text-green-400 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}