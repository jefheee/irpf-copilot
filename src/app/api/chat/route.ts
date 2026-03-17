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

    // CORREÇÃO 1: Fim das frases cortadas. Passamos os trechos puros e delimitados.
    let ragContext = "";
    if (documents && documents.length > 0) {
      ragContext = "TRECHOS RECUPERADOS DA BASE DE CONHECIMENTO OFICIAL:\n";
      documents.forEach((doc: any, index: number) => {
        ragContext += `--- INÍCIO DO TRECHO ${index + 1} ---\n${doc.content}\n--- FIM DO TRECHO ${index + 1} ---\n\n`;
      });
    } else {
      ragContext = "Nenhuma regra específica encontrada no manual oficial para esta pergunta exata.";
    }

    // CORREÇÃO 2: Instruções militares para a IA não se confundir
    const systemInstruction = `Você é o IRPF Copilot, um Consultor Tributário Sênior. 

DADOS REAIS DO USUÁRIO:
${JSON.stringify(contextData)}

BASE DE CONHECIMENTO (Manuais, Leis e Regras do IRPF):
${ragContext}

REGRAS DE POSTURA E CITAÇÃO (OBRIGATÓRIO):
1. DIRETO AO PONTO: É ESTRITAMENTE PROIBIDO iniciar a resposta com saudações ("Olá", "Como seu consultor", "Bem-vindo"). Comece a primeira linha já entregando a solução ou a análise.
2. CITAÇÃO DE FONTES INTELIGENTE: Leia os trechos da Base de Conhecimento e identifique qual a norma (Ex: IN RFB 2240, Lei 14.754, Guia de Renda Variável). No final da explicação, escreva de forma limpa: Fonte: [Nome da Lei ou Manual que você identificou]. Se o trecho não contiver um nome claro de lei ou manual, escreva apenas: Fonte: Diretrizes da Receita Federal. NUNCA cite partes de frases cortadas como fonte.
3. ESTRUTURA VISUAL: Use "### " para subtítulos. Use "---" em uma linha sozinha para criar uma linha divisória elegante entre seções diferentes. Use "* " para criar tópicos. Destaque valores em **negrito**. Parágrafos curtos de no máximo 3 linhas.
4. PASSO A PASSO: Para ações no sistema da Receita, crie listas numeradas indicando a ficha e o campo.`;

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