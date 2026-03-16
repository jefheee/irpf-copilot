import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é um Auditor Fiscal Sênior especialista no IRPF 2026 (Ano-Calendário 2025).
Seu objetivo é cruzar os dados do PASSADO com o PRESENTE, garantindo precisão nas novas regras da Receita Federal (ex: limite de bens de R$ 800 mil, Cashback IRPF) e buscando ativamente a MAXIMIZAÇÃO DA RESTITUIÇÃO.

RETORNE ESTRITAMENTE UM OBJETO JSON COM ESTAS 3 CHAVES:

{
  "documentos_pendentes": [
    "Identifique falhas no cruzamento. Ex: Faltam informes de rendimentos bancários cujas contas existiam no ano anterior, ou faltam recibos de despesas médicas mencionadas."
  ],
  "plano_acao": [
    {
      "titulo": "Ação isolada (Ex: Adicionar Chevrolet Onix)",
      "caminho": "Indique a Ficha exata do PGD.",
      "detalhes": "OBRIGATÓRIO: Faça um passo a passo NUMERADO (1., 2., 3.) explicando onde clicar e o que preencher. Não resuma. Seja extremamente detalhista nos campos e valores."
    }
  ],
  "fichas": [
    {
      "ficha": "Nome Oficial da Ficha",
      "dados": { "Nome do Campo Claro": "Valor formatado em R$" }
    }
  ]
}

REGRAS DE EXTRAÇÃO:
1. PREGUIÇA ZERO NAS FICHAS: Transcreva TODOS os dados consolidados. Não omita bens, dívidas ou rendimentos que constem na declaração base ou nos recibos novos. O JSON gerado deve ser um espelho completo.
2. ESPELHAMENTO DE PATRIMÔNIO: Identifique entradas e saídas. Bens alienados recebem situação R$ 0,00 no ano atual. Novos bens recebem apenas o valor EFETIVAMENTE PAGO até 31/12.
3. FORMATAÇÃO: Valores em Reais devem seguir o padrão "R$ 1.500,00". Chaves de dados devem ser legíveis, em português, com inicial maiúscula. Nunca use camelCase nas chaves.`;

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
      parts.push("=== DECLARAÇÃO BASE DO ANO ANTERIOR (PASSADO) ===");
      if (baseDocument.type === 'application/json' || baseDocument.name.endsWith('.json')) {
        const jsonText = await baseDocument.text();
        parts.push(`Dados do ano anterior:\n${jsonText}`);
      } else {
        const arrayBuffer = await baseDocument.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: baseDocument.type } });
      }
    }

    if (receipts.length > 0) {
      parts.push("=== RECIBOS E CONTRATOS DO ANO ATUAL (PRESENTE) ===");
      for (const file of receipts) {
        const arrayBuffer = await file.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: file.type } });
      }
    }

    parts.push("Mapeie a evolução patrimonial. Foque em identificar deduções legais para otimizar o resultado financeiro (Cashback IRPF). Retorne APENAS o JSON conforme instruído.");

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview', 
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(parts);
    return NextResponse.json(JSON.parse(result.response.text()));
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json({ error: 'Falha ao processar a extração fiscal.' }, { status: 500 });
  }
}