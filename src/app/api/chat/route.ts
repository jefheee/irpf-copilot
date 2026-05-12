import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyEducationDeductionGuard } from '../../../lib/guards/deduction_guard';

// Inicializa os DOIS motores de IA
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Prevenção Global de Prototype Pollution no motor V8
// Removido: Object.freeze(Object.prototype) quebra o build do Next.js (Turbopack/Webpack)

// Schema rigoroso para extração de variáveis contáveis do usuário
const DespesaSchema = z.object({
  tipo_despesa: z.string(),
  valor_bruto: z.number(),
  dependentes_envolvidos: z.number()
}).strict();

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

    const optimizedSearchQuery = translationCompletion.choices[0]?.message?.content || message;
    console.log(`[RAG] Query Original: "${message}" | Query Otimizada: "${optimizedSearchQuery}"`);

    // Busca no PgVector
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const queryEmbeddingResult = await embeddingModel.embedContent(optimizedSearchQuery);
    const queryVector = queryEmbeddingResult.embedding.values;

    const { data: documents } = await supabase.rpc('match_irpf_manual', {
      query_embedding: queryVector,
      match_threshold: 0.5,
      match_count: 5
    });

    let ragContext = "";
    if (documents && documents.length > 0) {
      ragContext = "TRECHOS RECUPERADOS DA BASE DE CONHECIMENTO OFICIAL:\n";
      documents.forEach((doc: any, index: number) => {
        const cleanName = (doc.document_name || "Manual Oficial").replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        const category = doc.category || "Geral";
        ragContext += `--- INÍCIO DO TRECHO ${index + 1} (Categoria: ${category} | Fonte: ${cleanName}) ---\n${doc.content}\n--- FIM DO TRECHO ${index + 1} ---\n\n`;
      });
    } else {
      ragContext = "Nenhuma regra específica encontrada no manual oficial para esta pergunta exata.";
    }

    // ============================================================================
    // PASSO 2: EXTRAÇÃO DE ENTIDADES (FORÇANDO MODO JSON CRÍTICO)
    // ============================================================================
    const extractionCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Você é uma máquina de extração analítica JSON de precisão militar. O seu objetivo é extrair os valores matemáticos pareando a intenção do usuário com o objeto DADOS FINANCEIROS INJETADOS. Retorne OBRIGATORIAMENTE E APENAS o objeto JSON tipificado (sem markdown, sem \`\`\`json, sem saudações ou explicações). Se não houver valores, retorne zeros.
Esquema Objeto Retornado Obrigatório:
{
  "tipo_despesa": string (exato escopo detectado, ex: instrucao, medico, pensao),
  "valor_bruto": number (quantia bruta localizada no contexto financeiro associado à intenção, 0 se não achar),
  "dependentes_envolvidos": number (número de CPFs dependentes envolvidos no fato consumado, ou 1 se não citado)
}`
        },
        { role: "user", content: `PERGUNTA DO USUÁRIO:\n${message}\n\nDADOS FINANCEIROS INJETADOS:\n${JSON.stringify(contextData)}` }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" } // Blindagem a nível da API
    });

    let mathContext = "";
    try {
      const rawJson = extractionCompletion.choices[0]?.message?.content || "{}";
      const cleanedJson = rawJson.replace(/[\x00-\x1F]+/g, ''); // Blindagem Resiliência
      const parsedData = JSON.parse(cleanedJson);
      const safeData = DespesaSchema.parse(parsedData); // Validado pelo ZOD

      // ============================================================================
      // PASSO 3: MOTOR DETERMINÍSTICO TYPESCRIPT (TAX GUARDS)
      // ============================================================================
      // Delegação de cálculos fora da alucinação do modelo
      if (safeData.valor_bruto === 0) {
        mathContext = ""; // Silencia bloqueios matemáticos irrelevantes para perguntas de contexto genérico
      } else if (safeData.tipo_despesa.toLowerCase().includes('instru') ||
        safeData.tipo_despesa.toLowerCase().includes('escola') ||
        safeData.tipo_despesa.toLowerCase().includes('educa')) {

        const calculoOficial = applyEducationDeductionGuard(safeData);
        mathContext = `\n[CÁLCULO ATUARIAL DO SISTEMA - NÃO ALUCINE SOBRE VALORES: ${calculoOficial.justificativa}]\n`;

      } else {
        mathContext = `\n[SISTEMA: Nenhuma trava matemática aplicada para a classe ${safeData.tipo_despesa}.]\n`;
      }
    } catch (err: any) {
      console.error("[SafeGuard Extração Zod Error]: ", err.message || err);
      mathContext = `\n[CÁLCULO ATUARIAL DO SISTEMA: Valores e despesas não identificados qualitativamente nos documentos em trânsito. Não foi aplicado cálculo atuarial. Baseie-se apenas em leis genéricas ou denuncie ao usuário a ausência dos valores no arquivo anexado.]\n`;
    }

    // ============================================================================
    // PASSO 4: SÍNTESE E STREAMING (SSE COM READABLE STREAM NATIVO)
    // ============================================================================
    const dataAtual = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date());

    const systemInstruction = `Você é o IRPF Copilot, um Consultor Tributário Sênior.
Hoje é ${dataAtual}. Foco absoluto na declaração Ano-Calendário 2025 (Exercício 2026).

DADOS DO USUÁRIO VINCULADO:
${JSON.stringify(contextData)}

BASE MILITAR DE CONHECIMENTO (Manuais e Leis):
${ragContext}
${mathContext}

REGRAS ESTÓICAS (OBRIGATÓRIO):
REGRA DE OURO: Se o utilizador perguntar sobre os dados dos seus documentos, baseia-te exclusivamente no objeto DADOS DO USUÁRIO VINCULADO. Se o banco de dados vetorial de Leis retornar informações não relacionadas ao contexto do utilizador (ex: regras de médicos para uma compra de carro), ignora a lei e não a menciones.
0. STRICT GROUNDING: Sua resposta só existe pelo contexto da base de dados e cálculo governamental fornecido. Se houver CÁLCULO ATUARIAL DO SISTEMA acima, você DEVE honrá-lo integralmente, reproduzindo a dedução apontada por ele sem inventar sua própria matemática.
1. DIRETO AO PONTO: Sem saudações ou blá blá blá motivacional de introdução. Entregue valor cru.
2. CITAÇÃO: Indique textualmente "Fonte:" para cada regra extraída das referências fornecidas.
3. ESTRUTURA VISUAL: "### " para subtítulos, "* " para enumerações e "---" entre seções. Enfatize números chave em **negrito**.
4. RESPOSTA EM PORTUGUÊS BRASILEIRO.`;

    // SSE Request to Groq (Stream = TRUE)
    const chatStreamResponse = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: message }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of chatStreamResponse) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            controller.enqueue(new TextEncoder().encode(content));
          }
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Erro no MSLR Core:', error);
    return NextResponse.json({ error: 'Falha letal processando Motor LLM.' }, { status: 500 });
  }
}
