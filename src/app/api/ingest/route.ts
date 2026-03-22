import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { chunk, document_name, category } = await req.json();

    if (!chunk || chunk.length < 10) {
      return NextResponse.json({ success: true, message: 'Ignorado' });
    }

    // 1. Google (Embeddings) - O ÚNICO modelo ativo e funcional em 2026
    let embedding;
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" }, { apiVersion: 'v1' });
      const result = await embeddingModel.embedContent(chunk);
      embedding = result.embedding.values;
    } catch (e: any) {
      console.error("Erro do Google:", e);
      return NextResponse.json({ error: `GOOGLE BLOQUEOU: ${e.message}` }, { status: 429 });
    }

    // 2. Supabase (Salvar no Banco) - Agora suporta 3072 dimensões!
    const { error } = await supabase.from('irpf_manual').insert({
      content: chunk,
      embedding: embedding,
      document_name: document_name,
      category: category || 'Geral',
    });

    if (error) {
      console.error("Erro do Supabase:", error);
      return NextResponse.json({ error: `SUPABASE BLOQUEOU: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Falha catastrófica.' }, { status: 500 });
  }
}