import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é um Auditor Fiscal Sênior especialista no IRPF 2026 (Ano-Calendário 2025).
Sua missão é atuar como um motor de "Intelligent Document Processing" (IDP). Extraia dados de PDFs e imagens com precisão cirúrgica, focando em MAXIMIZAR A RESTITUIÇÃO e blindar o usuário.

RETORNE ESTRITAMENTE UM OBJETO JSON COM ESTAS 4 CHAVES (Se não houver dados para uma chave, retorne OBRIGATORIAMENTE um array vazio []):

{
  "documentos_pendentes": [
    "Avisos críticos."
  ],
  "plano_acao": [
    {
      "titulo": "Ação (Ex: Lançar Despesa Médica)",
      "caminho": "Ficha",
      "detalhes": "1. Passo\\n2. Passo"
    }
  ],
  "fichas": [
    {
      "ficha": "Nome Oficial da Ficha",
      "dados": { "Nome do Campo": "Valor" }
    }
  ],
  "otimizacao_futura": "Uma dica proativa de planejamento financeiro."
}

REGRAS DE AUDITORIA:
1. CAÇA ÀS DEDUÇÕES: Vasculhe as imagens por despesas. Extraia CNPJ/CPF.
2. CONSOLIDAÇÃO: Se houver múltiplos recibos do mesmo prestador, SOME os valores num único card.
3. FILTRO: Ignore farmácia, academia ou material escolar para o 'plano_acao', mas avise em 'documentos_pendentes'.
4. BENS: Para veículos financiados, declare APENAS o valor pago no ano.
5. PLANEJAMENTO: Utilize 'otimizacao_futura' para entregar um conselho de alto valor.`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const baseDocument = formData.get('baseDocument') as File | null;
    const receipts = formData.getAll('receipts') as File[];

    if (!baseDocument && receipts.length === 0) {
      return NextResponse.json({ error: 'Nenhum documento.' }, { status: 400 });
    }

    const parts: any[] = [];

    if (baseDocument) {
      if (baseDocument.type === 'application/json' || baseDocument.name.endsWith('.json')) {
        const jsonText = await baseDocument.text();
        parts.push(`=== DECLARAÇÃO BASE ===\n${jsonText}`);
      } else {
        const arrayBuffer = await baseDocument.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: baseDocument.type } });
      }
    }

    if (receipts.length > 0) {
      parts.push("=== NOVOS RECIBOS ===");
      for (const file of receipts) {
        const arrayBuffer = await file.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: file.type } });
      }
    }

    parts.push("Mapeie a evolução patrimonial. Lembre-se: SE NÃO HOUVER AÇÕES, RETORNE 'plano_acao': [] COMO UM ARRAY VAZIO.");

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(parts);
    const textResponse = result.response.text();

    // PROTEÇÃO 1: Limpeza Anti-Markdown (Remove blocos de código que a IA possa injetar)
    const cleanJsonText = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJsonText);

    // PROTEÇÃO 2: Conversão Forçada de Tipos (Garante que o React nunca faça .map() numa string)
    const safeResponse = {
      documentos_pendentes: Array.isArray(parsedData.documentos_pendentes) ? parsedData.documentos_pendentes : [],
      plano_acao: Array.isArray(parsedData.plano_acao) ? parsedData.plano_acao : [],
      fichas: Array.isArray(parsedData.fichas) ? parsedData.fichas : [],
      otimizacao_futura: typeof parsedData.otimizacao_futura === 'string' ? parsedData.otimizacao_futura : undefined
    };

    return NextResponse.json(safeResponse);

  } catch (error: any) {
    console.error("Extraction error:", error);
    return NextResponse.json({ error: 'Falha ao processar a extração fiscal ou ao interpretar o JSON.' }, { status: 500 });
  }
}