import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

// Inicializa os DOIS motores de IA
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { message, contextData } = await req.json();

    if (!message) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });

    // AGENTE 1 (GEMINI): Apenas converte a pergunta em vetor para achar a lei no banco
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const queryEmbeddingResult = await embeddingModel.embedContent(message);
    const queryVector = queryEmbeddingResult.embedding.values;

    // BUSCA NO BANCO (RAG)
    const { data: documents, error } = await supabase.rpc('match_irpf_manual', {
      query_embedding: queryVector,
      match_threshold: 0.5,
      match_count: 5 
    });

    let ragContext = "";
    if (documents && documents.length > 0) {
      ragContext = "TRECHOS RECUPERADOS DA BASE DE CONHECIMENTO OFICIAL:\n";
      documents.forEach((doc: any, index: number) => {
        ragContext += `--- INÍCIO DO TRECHO ${index + 1} ---\n${doc.content}\n--- FIM DO TRECHO ${index + 1} ---\n\n`;
      });
    } else {
      ragContext = "Nenhuma regra específica encontrada no manual oficial para esta pergunta exata.";
    }

    // AGENTE 2 (GROQ / LLAMA 3): Assume o raciocínio e a escrita ultra-rápida
    const systemInstruction = `Você é o IRPF Copilot, um Consultor Tributário Sênior. 

DADOS REAIS DO USUÁRIO:
${JSON.stringify(contextData)}

BASE DE CONHECIMENTO (Manuais, Leis e Regras do IRPF):
${ragContext}

REGRAS DE POSTURA E CITAÇÃO (OBRIGATÓRIO):
1. DIRETO AO PONTO: É ESTRITAMENTE PROIBIDO iniciar a resposta com saudações ("Olá", "Como seu consultor", "Bem-vindo"). Comece a primeira linha já entregando a solução ou a análise.
2. CITAÇÃO DE FONTES INTELIGENTE: Leia os trechos da Base de Conhecimento e identifique qual a norma. No final da explicação, escreva de forma limpa: Fonte: [Nome da Lei ou Manual que você identificou].
3. ESTRUTURA VISUAL: Use "### " para subtítulos. Use "---" em uma linha sozinha para criar uma linha divisória elegante. Use "* " para criar tópicos. Destaque valores em **negrito**.
4. IDIOMA: Responda ESTRITAMENTE em Português do Brasil. Se o usuário falar em outro idioma, traduza a resposta para Português do Brasil.`;

// Chamada ultra-rápida para o Groq usando o modelo Llama 3.3
const chatCompletion = await groq.chat.completions.create({
  messages: [
    { role: "system", content: systemInstruction },
    { role: "user", content: message }
  ],
  model: "llama-3.3-70b-versatile", // Modelo substituto validado
  temperature: 0.1,
});

    return NextResponse.json({ reply: chatCompletion.choices[0]?.message?.content || "" });

  } catch (error: any) {
    console.error('Erro no chat (Multi-Agente):', error);
    return NextResponse.json({ error: 'Falha ao processar a resposta do assistente.' }, { status: 500 });
  }
}