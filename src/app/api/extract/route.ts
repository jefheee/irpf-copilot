import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é um Auditor Fiscal Sênior especialista no IRPF 2026.

RETORNE ESTRITAMENTE UM OBJETO JSON COM ESTAS 3 CHAVES:

{
  "documentos_pendentes": ["..."],
  "plano_acao": [
    {
      "titulo": "Ação (Ex: Adicionar Chevrolet Onix)",
      "caminho": "Ficha exata do PGD.",
      "detalhes": "1. Clique em 'Novo'.\\n2. Escolha o Código XX.\\n3. No campo Valor, insira R$ YY. (USE SEMPRE ESTE FORMATO DE LISTA COM QUEBRAS DE LINHA '\\n')."
    }
  ],
  "fichas": [
    {
      "ficha": "Nome Oficial da Ficha",
      "dados": { "Nome do Campo": "Valor" }
    }
  ]
}

REGRAS:
- DETALHES EM TÓPICOS: A chave 'detalhes' do 'plano_acao' NUNCA PODE ser um texto corrido. Use "\\n" para separar os passos numerados (1., 2., 3.).
- Atualize mentalmente para 2026: Isenção de bens = R$ 800 mil. Bolsa = R$ 40 mil.`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const baseDocument = formData.get('baseDocument') as File | null;
    const receipts = formData.getAll('receipts') as File[];

    if (!baseDocument && receipts.length === 0) return NextResponse.json({ error: 'Nenhum documento.' }, { status: 400 });

    const parts: any[] = [];
    if (baseDocument) {
      if (baseDocument.type === 'application/json' || baseDocument.name.endsWith('.json')) {
        parts.push(`=== PASSADO ===\n${await baseDocument.text()}`);
      } else {
        const ab = await baseDocument.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(ab).toString('base64'), mimeType: baseDocument.type } });
      }
    }

    if (receipts.length > 0) {
      parts.push("=== PRESENTE ===");
      for (const file of receipts) {
        const ab = await file.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(ab).toString('base64'), mimeType: file.type } });
      }
    }

    parts.push("Mapeie a evolução. No plano_acao, gere o passo a passo com QUEBRAS DE LINHA (\\n).");

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview', systemInstruction: systemPrompt, generationConfig: { temperature: 0, responseMimeType: 'application/json' }});
    const result = await model.generateContent(parts);
    return NextResponse.json(JSON.parse(result.response.text()));
  } catch (error) {
    return NextResponse.json({ error: 'Falha.' }, { status: 500 });
  }
}