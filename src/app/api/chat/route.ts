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

    // ============================================================================
    // PASSO 1: QUERY REWRITING (TRADUÇÃO PRÉ-BUSCA)
    // ============================================================================
    const translationCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um tradutor de jargão tributário da Receita Federal do Brasil (IRPF). Converta a dúvida do usuário em uma string de busca otimizada contendo apenas palavras-chave técnicas, termos legais e nomes de fichas de declaração. Retorne APENAS as palavras-chave separadas por vírgula, sem explicações ou saudações."
        },
        { role: "user", content: message }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0, // Máximo determinismo
    });

    // Se a tradução falhar por algum motivo, faz fallback para a mensagem original
    const optimizedSearchQuery = translationCompletion.choices[0]?.message?.content || message;
    console.log(`[RAG] Query Original: "${message}" | Query Otimizada: "${optimizedSearchQuery}"`);

    // ============================================================================
    // PASSO 2: EMBEDDING E BUSCA VETORIAL (COM A QUERY OTIMIZADA)
    // ============================================================================
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" }, { apiVersion: 'v1' });
    const queryEmbeddingResult = await embeddingModel.embedContent(optimizedSearchQuery);
    const queryVector = queryEmbeddingResult.embedding.values;

    const { data: documents, error } = await supabase.rpc('match_irpf_manual', {
      query_embedding: queryVector,
      match_threshold: 0.5,
      match_count: 5
    });

    // ============================================================================
    // PASSO 3: MONTAGEM DO CONTEXTO (COM LIMPEZA DE METADADOS)
    // ============================================================================
    let ragContext = "";
    if (documents && documents.length > 0) {
      ragContext = "TRECHOS RECUPERADOS DA BASE DE CONHECIMENTO OFICIAL:\n";
      documents.forEach((doc: any, index: number) => {
        // Limpeza do nome do arquivo (remove .txt/.pdf e troca _ por espaço)
        const rawName = doc.document_name || "Manual Oficial";
        const cleanName = rawName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        const category = doc.category || "Geral";

        ragContext += `--- INÍCIO DO TRECHO ${index + 1} (Categoria: ${category} | Fonte: ${cleanName}) ---\n${doc.content}\n--- FIM DO TRECHO ${index + 1} ---\n\n`;
      });
    } else {
      ragContext = "Nenhuma regra específica encontrada no manual oficial para esta pergunta exata.";
    }

    // ============================================================================
    // PASSO 4: RESPOSTA FINAL (AGENTE 2 - GROQ)
    // ============================================================================
    // Consciência Temporal
    const dataAtual = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date());

    const systemInstruction = `Você é o IRPF Copilot, um Consultor Tributário Sênior de altíssimo nível.
Hoje é ${dataAtual}. As orientações devem ser focadas na declaração do Ano-Calendário 2025 (Exercício 2026).

DADOS REAIS DO USUÁRIO (EXTRAÍDOS DE PDFs):
${JSON.stringify(contextData)}

BASE DE CONHECIMENTO (Manuais, Leis e Regras do IRPF):
${ragContext}

REGRAS DE POSTURA E CITAÇÃO (OBRIGATÓRIO):
1. DIRETO AO PONTO: É ESTRITAMENTE PROIBIDO iniciar a resposta com saudações ("Olá", "Como seu consultor", "Bem-vindo"). Comece a primeira linha já entregando a solução ou a análise.
2. CITAÇÃO DE FONTES INTELIGENTE: Leia os trechos da Base de Conhecimento e identifique qual a norma. No final da explicação, escreva de forma limpa e elegante: "Fonte: [Nome da Fonte limpa]". Nunca cite o número do trecho.
3. ESTRUTURA VISUAL: Use "### " para subtítulos. Use "---" em uma linha sozinha para criar uma linha divisória elegante. Use "* " para criar tópicos. Destaque valores em **negrito**.
4. GUARDRAIL (CRÍTICO): Você DEVE recusar educadamente responder a qualquer pergunta que saia do escopo de IRPF, contabilidade, finanças, offshores, criptoativos ou otimização de riqueza. Não atue como programador, médico, tradutor ou cozinheiro.
5. IDIOMA: Responda ESTRITAMENTE em Português do Brasil.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: message }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
    });

    return NextResponse.json({ reply: chatCompletion.choices[0]?.message?.content || "" });

  } catch (error: any) {
    console.error('Erro no chat (Multi-Agente):', error);
    return NextResponse.json({ error: 'Falha ao processar a resposta do assistente.' }, { status: 500 });
  }
}