import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

const UniversalDocumentSchema = z.object({
  categoria: z.enum(['B3', 'SAUDE', 'EDUCACAO', 'DECLARACAO_ANTERIOR', 'CONTRATO_VEICULO', 'RENDIMENTOS_RETIDOS', 'OUTROS']),
  resumo_identificacao: z.object({
    titular_ou_dependente: z.string().nullable().optional(),
    cpf_cnpj_envolvido: z.string().nullable().optional(),
  }).optional(),
  dados_financeiros_extensos: z.array(z.object({
    entidade_ou_ativo: z.string().nullable().optional(),
    valor_identificado: z.number().nullable().optional(),
    natureza: z.string().nullable().optional(),
    data_fato_gerador: z.string().nullable().optional()
  })).nullable().optional()
});

const systemPrompt = `És um Auditor Fiscal Rigoroso. Se o documento for um Recibo, Fatura, Contrato de Compra ou Comprovante de Rendimentos, PROÍBO resumos. Deves varrer o documento e povoar o array dados_financeiros_extensos com CADA valor monetário, salário, imposto retido ou bem adquirido (ex: Carros) encontrado no documento.`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const documentFile = formData.get('document') as File | null;

    if (!documentFile) {
      return NextResponse.json({ error: 'Nenhum documento anexado para processamento.' }, { status: 400 });
    }

    if (documentFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'O ficheiro excede o tamanho máximo suportado.' }, { status: 413 });
    }

    const arrayBuffer = await documentFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // Suporte dinâmico para MimeType (PDF e Imagens)
    const inlineData = {
      inlineData: {
        data: base64Data,
        mimeType: documentFile.type
      }
    };

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json'
      },
    });

    const result = await model.generateContent([inlineData, "Extrair dados operacionais e financeiros deste documento via schema taxado."]);
    const textResponse = result.response.text();

    // Blindagem Regex para resiliência (conforme regras) antes do parse
    const sanitizedText = textResponse.replace(/[\x00-\x1F]+/g, "");
    const parsedData = JSON.parse(sanitizedText);
    const safeData = UniversalDocumentSchema.parse(parsedData);

    return NextResponse.json(safeData);

  } catch (error: any) {
    console.error("[Extração Error]:", error);

    if (error.status === 429 || error.message?.includes('429')) {
      return NextResponse.json({ error: 'Rate limit excedido na API de Inteligência.' }, { status: 429 });
    }

    return NextResponse.json({ error: 'Falha na avaliação e extração estrutural do documento financeiro.' }, { status: 500 });
  }
}