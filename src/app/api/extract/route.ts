import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

const BrokerageNoteSchema = z.object({
  data_pregao: z.string(),
  corretora: z.string(),
  operacoes: z.array(Object.assign(z.object({
    ticker: z.string(),
    tipo: z.enum(['COMPRA', 'VENDA']),
    classificacao: z.enum(['DAY_TRADE', 'OPERACAO_COMUM']),
    quantidade: z.number(),
    preco_unitario: z.number(),
    valor_total_rateado: z.number() // Já com emolumentos diluídos
  }))),
  eventos_pendentes: z.boolean()
});

const systemPrompt = `Você é um motor de "Intelligent Document Processing" (IDP) que age como o Py_Financas/CorrePy. Especialista na taxonomia da B3 (Notas de Corretagem SINACOR).

OBJETIVO PRINCIPAL: Extrair dados estruturados das notas de corretagem. Retorne ESTRITAMENTE um objeto JSON válido.

HEURÍSTICAS BRASILEIRAS (B3) EXIGIDAS:
* REGRAS DE TAXONOMIA DETALHADA: Não confie exclusivamente na letra (D) ou (N) impressa na nota. Verifique ativamente: Se encontrar operações de COMPRA (C) E VENDA (V) do MESMO ATIVO (ticker, ex: PETR4) na MESMA DATA na MESMA corretora, classifique TODAS as partes dessa operação casada obrigatoriamente como "DAY_TRADE". Se não, classifique como "OPERACAO_COMUM".
* DILUIÇÃO DE CUSTOS (CRÍTICO): Os totais do "Resumo Financeiro" (Taxa de liquidação, CBLC, Corretagem) são cobrados de forma agregada ao fim. O campo "valor_total_rateado" NÃO é apenas quantidade * preço. OBRIGATORIAMENTE calcule o custo exato: Encontre os Custos e Emolumentos totais do documento, calcule o % que o Volume Financeiro desta Operação representa ante o Volume Total do pregão, e agregue esta exata fatia de custo à operação (somando se for compra, ou deduzindo do líquido se for venda).
* EVENTOS SOCIETÁRIOS: Identifique ocorrências atípicas como 'Desdobramento', 'Grupamento', 'Bonificação'. Ative "eventos_pendentes": true se existirem na folha.

SCHEMA OBRIGATÓRIO:
{
  "data_pregao": "DD/MM/YYYY",
  "corretora": "Nome da Instituição",
  "operacoes": [
    {
      "ticker": "Código Ativo (Ex: VALE3)",
      "tipo": "COMPRA" ou "VENDA",
      "classificacao": "DAY_TRADE" ou "OPERACAO_COMUM",
      "quantidade": number,
      "preco_unitario": number,
      "valor_total_rateado": number
    }
  ],
  "eventos_pendentes": boolean
}`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    // Forçamos o processamento de 1 (UM) documento por chamada (Estratégia Anti-Timeout)
    const documentFile = formData.get('document') as File | null;

    if (!documentFile) {
      return NextResponse.json({ error: 'Nenhum documento B3 anexado para processamento.' }, { status: 400 });
    }
    
    // Payload Size Limit Defense (Prevents Next.js crash/RAM max out)
    if (documentFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'O ficheiro excede o tamanho máximo suportado.' }, { status: 413 });
    }

    const arrayBuffer = await documentFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    const inlineData = {
      inlineData: {
        data: base64Data,
        mimeType: documentFile.type
      }
    };

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.0-pro', 
      systemInstruction: systemPrompt,
      generationConfig: { 
        temperature: 0, 
        responseMimeType: 'application/json' 
      },
    });

    const result = await model.generateContent([inlineData, "Extrair dados operacionais desta nota da B3 via schema taxado."]);
    const textResponse = result.response.text();
    
    // Regra de arquitetura: Adoção 100% nativa de type: json_object (Gemini equivalent) sem fallback regex (Resolução de Event Loop Overhead)
    const parsedData = JSON.parse(textResponse);
    const safeData = BrokerageNoteSchema.parse(parsedData);

    return NextResponse.json(safeData);

  } catch (error: any) {
    if (error.status === 429 || error.message?.includes('429')) {
       return NextResponse.json({ error: 'Rate limit excedido na API de Inteligência.' }, { status: 429 });
    }
    
    // Default 500 without stack trace leakage to secure architecture
    return NextResponse.json({ error: 'Falha na avaliação e extração estrutural do documento financeiro.' }, { status: 500 });
  }
}