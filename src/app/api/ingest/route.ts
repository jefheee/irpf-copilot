import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { chunk } = await req.json();

    // Ignora pedaços vazios ou muito curtos para poupar banco de dados
    if (!chunk || chunk.length < 10) {
      return NextResponse.json({ success: true, message: 'Ignorado' });
    }

    // 1. Converte o texto para vetor matemático
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await embeddingModel.embedContent(chunk);
    const embedding = result.embedding.values;

    // 2. Salva no Supabase
    const { error } = await supabase.from('irpf_manual').insert({
      content: chunk,
      embedding: embedding,
    });

    if (error) {
      console.error("Erro do Supabase:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Erro na ingestão:', error);
    return NextResponse.json({ error: error.message || 'Falha na API.' }, { status: 500 });
  }
}