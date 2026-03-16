'use client';

import { useState } from 'react';

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
        
        const chunks = chunkText(textData, 1500);

        setStatus((prev) => `${prev}\nO arquivo foi dividido em ${chunks.length} blocos. Iniciando envio seguro (15 requisições por minuto)...`);

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

          // Pausa de 4.2 segundos OBRIGATÓRIA para não irritar o Google (Limite de 15 RPM)
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
    <div className="min-h-screen bg-neutral-50 p-10 text-neutral-900">
      <div className="max-w-3xl mx-auto space-y-6 bg-white p-8 border border-neutral-200 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold">Painel Admin: Ingestão de Conhecimento</h1>
        <p className="text-neutral-600 text-sm">
          Este processo será <strong>lento</strong> (cerca de 4 segundos por bloco) para respeitar
          as cotas gratuitas do Google Gemini sem causar bloqueios.
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
            {isLoading ? 'Processando (não feche a página)...' : 'Vetorizar e Salvar no Supabase'}
          </button>
        </div>

        {status && (
          <div className="mt-6 bg-neutral-900 text-green-400 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}