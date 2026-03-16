import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para quebrar textos gigantes em parágrafos/blocos de tamanho razoável
function chunkText(text: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  // Quebra por parágrafos duplos (comum em TXT)
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

export async function POST(req: Request) {
  try {
    const { textData } = await req.json();

    if (!textData) {
      return NextResponse.json({ error: 'Nenhum texto enviado.' }, { status: 400 });
    }

    // 1. Fatiar o texto
    const chunks = chunkText(textData, 1500); // Fatias de ~1500 caracteres
    
    // Modelo de Embeddings (O Cérebro de Interpretação)
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

    let count = 0;

    // 2. Para cada fatia, cria o vetor e guarda no Supabase
    for (const chunk of chunks) {
      // Ignora pedaços muito pequenos (ruído)
      if (chunk.length < 50) continue; 

      const result = await embeddingModel.embedContent(chunk);
      const embedding = result.embedding.values;

      const { error } = await supabase.from('irpf_manual').insert({
        content: chunk,
        embedding: embedding,
      });

      if (error) console.error("Erro ao inserir no Supabase:", error);
      else count++;
    }

    return NextResponse.json({ success: true, message: `${count} blocos processados e salvos com sucesso no Supabase!` });
    
  } catch (error) {
    console.error('Erro na ingestão:', error);
    return NextResponse.json({ error: 'Falha ao processar ingestão.' }, { status: 500 });
  }
}