import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Usamos a mesma lógica de chave segura da ingestão
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { message, contextData } = await req.json();

    if (!message) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });

    // 1. Transformar a pergunta do usuário num vetor matemático (O mesmo modelo usado na ingestão)
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const queryEmbeddingResult = await embeddingModel.embedContent(message);
    const queryVector = queryEmbeddingResult.embedding.values;

    // 2. RAG: Buscar no Supabase as regras mais relevantes do Manual da Receita
    const { data: documents, error } = await supabase.rpc('match_irpf_manual', {
      query_embedding: queryVector,
      match_threshold: 0.5, // Limite mínimo de similaridade para evitar regras aleatórias
      match_count: 5 // Traz os 5 parágrafos mais relevantes
    });

    if (error) {
      console.error("Erro na busca do Supabase:", error);
      // Se falhar a busca, não derrubamos o chat, apenas logamos
    }

    // 3. Montar a Base de Conhecimento com os resultados do Supabase
    let ragContext = "";
    if (documents && documents.length > 0) {
      ragContext = "REGRAS OFICIAIS DA RECEITA FEDERAL (MANUAL 2024/2025):\n";
      documents.forEach((doc: any, index: number) => {
        ragContext += `[Regra ${index + 1}]: ${doc.content}\n\n`;
      });
    } else {
      ragContext = "Nenhuma regra específica encontrada no manual oficial para esta pergunta exata.";
    }

    // 4. Montar a Instrução Mestra (Prompt) para a IA do Chat
    const systemInstruction = `Você é o IRPF Copilot, um Consultor Tributário Sênior. 
Seu objetivo é orientar o usuário com precisão absoluta, focando na conformidade com a Receita Federal e na maximização de restituições legais.

DADOS REAIS DO USUÁRIO (Base da Declaração + Recibos Novos):
${JSON.stringify(contextData)}

BASE DE CONHECIMENTO (Extraída do Perguntão/Manual Oficial da Receita):
${ragContext}

REGRAS DE POSTURA E RESPOSTA:
1. RESPONDA COM BASE NA LEI: Utilize PRIMARIAMENTE a "Base de Conhecimento" acima para responder. Se a resposta estiver nas regras fornecidas, cite o procedimento passo a passo.
2. CONTEXTUALIZE: Se a pergunta envolver os dados reais do usuário (ex: "quanto ganhei de salário?"), procure nos "Dados Reais do Usuário".
3. SEM ALUCINAÇÃO: Se a Base de Conhecimento não cobrir a dúvida e você não tiver certeza absoluta da regra fiscal brasileira, diga que não encontrou essa informação nos manuais carregados.
4. FORMATAÇÃO: Seja claro, direto e didático. Use **negrito** para destacar valores, códigos de fichas e nomes importantes. Crie listas quando explicar um passo a passo. Parágrafos curtos.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction,
      generationConfig: { temperature: 0.1 }, // Temperatura muito baixa para garantir respostas factuais
    });

    const result = await model.generateContent(message);
    return NextResponse.json({ reply: result.response.text() });

  } catch (error: any) {
    console.error('Erro no chat:', error);
    return NextResponse.json({ error: 'Falha ao processar a resposta do assistente.' }, { status: 500 });
  }
}