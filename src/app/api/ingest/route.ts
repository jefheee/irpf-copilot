import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Usamos a chave mestra para furar bloqueios de segurança (RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { chunk } = await req.json();

    if (!chunk || chunk.length < 10) {
      return NextResponse.json({ success: true, message: 'Ignorado' });
    }

    // 1. Google: Converte o texto para vetor matemático
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await embeddingModel.embedContent(chunk);
    const embedding = result.embedding.values;

    // 2. Supabase: Salva o texto e o vetor no banco
    const { error } = await supabase.from('irpf_manual').insert({
      content: chunk,
      embedding: embedding,
    });

    if (error) {
      console.error("Erro do Supabase:", error);
      return NextResponse.json({ error: `Supabase negou o acesso: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Erro na ingestão:', error);
    return NextResponse.json({ error: error.message || 'Google Gemini recusou a requisição.' }, { status: 500 });
  }
}