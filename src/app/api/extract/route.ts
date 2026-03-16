import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é um Auditor Fiscal especialista em IRPF.
O seu trabalho é cruzar o JSON do Ano Anterior (PASSADO) com os Recibos do Ano Atual (PRESENTE).

VOCÊ DEVE RETORNAR ESTRITAMENTE UM OBJETO JSON COM AS 3 CHAVES ABAIXO:

{
  "documentos_pendentes": [
    "Quais documentos do PASSADO faltam ser enviados no PRESENTE. (Seja breve)."
  ],
  "plano_acao": [
    {
      "titulo": "Ex: Adicionar Chevrolet Onix",
      "caminho": "MENU NO PGD: Bens e Direitos",
      "detalhes": "Passo a passo exato."
    }
  ],
  "fichas": [
    {
      "ficha": "Nome Oficial da Ficha (Ex: Bens e Direitos)",
      "dados": { "Nome do Campo em Português": "Valor formatado em R$" }
    }
  ]
}

REGRAS DE FORMATAÇÃO E OTIMIZAÇÃO:
1. NOME DA FICHA: OBRIGATORIAMENTE use o nome oficial do PGD (ex: 'Rendimentos Isentos'). NUNCA use chaves de código (ex: 'isentosNaoTributaveis').
2. CHAVES DOS DADOS: Escreva em português claro (ex: "CNPJ da Fonte", "Valor Atual"). NUNCA use camelCase.
3. VALORES: Formate todos os valores financeiros no padrão "R$ 1.500,00".
4. VELOCIDADE: Na chave "fichas", inclua APENAS os dados que foram adicionados, alterados ou consolidados a partir dos novos recibos. Não reescreva toda a declaração antiga se ela não sofreu mutação.`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const baseDocument = formData.get('baseDocument') as File | null;
    const receipts = formData.getAll('receipts') as File[];

    if (!baseDocument && receipts.length === 0) return NextResponse.json({ error: 'Nenhum documento.' }, { status: 400 });

    const parts: any[] = [];

    if (baseDocument) {
      parts.push("=== DECLARAÇÃO PASSADA ===");
      if (baseDocument.type === 'application/json' || baseDocument.name.endsWith('.json')) {
        const jsonText = await baseDocument.text();
        parts.push(jsonText);
      } else {
        const arrayBuffer = await baseDocument.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: baseDocument.type } });
      }
    }

    if (receipts.length > 0) {
      parts.push("=== RECIBOS ATUAIS ===");
      for (const file of receipts) {
        const arrayBuffer = await file.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: file.type } });
      }
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview', 
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(parts);
    return NextResponse.json(JSON.parse(result.response.text()));
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao processar.' }, { status: 500 });
  }
}