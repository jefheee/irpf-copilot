import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { message, contextData } = await req.json();

    if (!message) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });

    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const queryEmbeddingResult = await embeddingModel.embedContent(message);
    const queryVector = queryEmbeddingResult.embedding.values;

    const { data: documents, error } = await supabase.rpc('match_irpf_manual', {
      query_embedding: queryVector,
      match_threshold: 0.5,
      match_count: 5 
    });

    let ragContext = "";
    if (documents && documents.length > 0) {
      ragContext = "REGRAS OFICIAIS E ATUALIZAÇÕES IRPF 2026:\n";
      documents.forEach((doc: any, index: number) => {
        ragContext += `[Regra ${index + 1}]: ${doc.content}\n\n`;
      });
    } else {
      ragContext = "Nenhuma regra específica encontrada no manual oficial para esta pergunta exata.";
    }

    const systemInstruction = `Você é o IRPF Copilot, um Consultor Tributário Sênior (Foco em IRPF 2026/Ano-Calendário 2025). 

DADOS REAIS DO USUÁRIO:
${JSON.stringify(contextData)}

BASE DE CONHECIMENTO (Manuais e Novas Regras 2026):
${ragContext}

REGRAS OBRIGATÓRIAS DE RESPOSTA E FORMATAÇÃO:
1. MAXIMIZAR CASHBACK: Se a pergunta for sobre restituição, instrua ativamente o usuário a buscar recibos médicos/educação não inseridos e explique a diferença entre Dedução Legal e Simplificada.
2. PASSO A PASSO (CRÍTICO): Quando instruir o usuário a fazer algo no PGD (Programa Gerador), você DEVE criar uma lista numerada (1., 2., 3.) indicando a ficha, o código e o campo exato. Não escreva "texto corrido".
3. ESTRUTURA VISUAL: Use "### " para subtítulos. Use "* " para criar "bullet points" (tópicos). Destaque valores em **negrito**. Parágrafos curtos.
4. ATUALIZAÇÃO 2026: Responda usando os novos limites (ex: Bens até R$ 800 mil, Bolsa R$ 40 mil) caso estejam na Base de Conhecimento.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction,
      generationConfig: { temperature: 0.1 }, 
    });

    const result = await model.generateContent(message);
    return NextResponse.json({ reply: result.response.text() });

  } catch (error: any) {
    console.error('Erro no chat:', error);
    return NextResponse.json({ error: 'Falha ao processar a resposta do assistente.' }, { status: 500 });
  }
}