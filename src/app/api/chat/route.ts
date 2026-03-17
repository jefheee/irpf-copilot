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

    // CORREÇÃO 1: Formatação da Base de Dados para a IA (Removido o [Regra X])
    let ragContext = "";
    if (documents && documents.length > 0) {
      ragContext = "DOCUMENTAÇÃO OFICIAL DA RECEITA FEDERAL (BASE DE CONHECIMENTO):\n";
      documents.forEach((doc: any) => {
        // Pega a primeira linha do documento (que geralmente é o título/nome do arquivo que você enviou) para servir de nome da fonte
        const sourceName = doc.content.split('\n')[0].substring(0, 60).replace(/[^a-zA-Z0-9 À-ÿ]/g, '').trim();
        ragContext += `[Documento: ${sourceName}]\nConteúdo: ${doc.content}\n\n`;
      });
    } else {
      ragContext = "Nenhuma regra específica encontrada no manual oficial para esta pergunta exata.";
    }

    // CORREÇÃO 2: Prompt Implacável (Sem saudações, fontes reais e sem asteriscos)
    const systemInstruction = `Você é o IRPF Copilot, um Consultor Tributário Sênior. 

DADOS REAIS DO USUÁRIO:
${JSON.stringify(contextData)}

BASE DE CONHECIMENTO (Manuais e Novas Regras 2026):
${ragContext}

REGRAS DE POSTURA (OBRIGATÓRIO):
1. DIRETO AO PONTO: NUNCA inicie a resposta com saudações (ex: "Olá!", "Como seu consultor..."). Comece a resposta imediatamente com a solução ou a análise prática.
2. CITAÇÃO DE FONTES: Você DEVE embasar suas afirmações. No final do parágrafo, escreva a fonte exatamente assim: Fonte: Nome do Documento. NUNCA use asteriscos, itálico ou parênteses em volta da palavra Fonte. Exemplo correto: Fonte: Instrução Normativa 2240.
3. ESTRUTURA VISUAL: Use "### " para subtítulos. Use "---" em uma linha sozinha para separar seções importantes. Use "* " para criar tópicos. Destaque valores em **negrito**. Parágrafos curtos.
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