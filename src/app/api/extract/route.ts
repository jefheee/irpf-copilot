import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

const UniversalDocumentSchema = z.object({
  categoria: z.enum(['B3', 'SAUDE', 'EDUCACAO', 'IDENTIFICACAO', 'DECLARACAO_ANTERIOR', 'OUTROS']),
  descricao_generica: z.string().optional(),
  data_pregao: z.string().optional(),
  corretora: z.string().optional(),
  operacoes: z.array(z.object({
    ticker: z.string(),
    tipo: z.enum(['COMPRA', 'VENDA']),
    classificacao: z.enum(['DAY_TRADE', 'OPERACAO_COMUM']),
    quantidade: z.number(),
    preco_unitario: z.number(),
    valor_total_rateado: z.number()
  })).optional(),
  eventos_pendentes: z.boolean().optional(),
  data_emissao: z.string().optional(),
  emissor: z.string().optional(),
  valor_total: z.number().optional(),
  dados_declaracao_anterior: z.object({
    ano_exercicio: z.string().nullable().optional(),
    total_bens_direitos: z.number().nullable().optional(),
    dependentes_identificados: z.number().nullable().optional()
  }).optional()
});

const systemPrompt = `Você é um motor de "Intelligent Document Processing" (IDP) Omnívoro. Especialista em taxonomia fiscal fechada.

OBJETIVO PRINCIPAL: Extrair dados estruturados de qualquer documento financeiro. Retorne ESTRITAMENTE um objeto JSON válido.

HEURÍSTICAS DE CATEGORIZAÇÃO:
1. B3 (Notas de Corretagem): Extraia as operações. Se encontrar COMPRA E VENDA do MESMO ATIVO na MESMA DATA, é DAY_TRADE. Dilua os custos ("valor_total_rateado"). Alerte "eventos_pendentes" se houver Desdobramento/Grupamento/Bonificação.
2. DECLARACAO_ANTERIOR: Se o documento for o Recibo ou as Fichas da Declaração de Ajuste Anual do IRPF de anos anteriores (DECLARACAO_ANTERIOR), não procure despesas. Extraia o Ano do Exercício, conte quantos dependentes existem listados e resuma o valor total em Bens e Direitos. O objetivo é criar um mapa base para a declaração atual.
3. SAUDE / EDUCACAO: Extraia data de emissão, nome do emissor (médico/hospital/escola) e valor total. Adicione uma descricao_generica do serviço.
4. IDENTIFICACAO: Se for RG/CNH.
5. OUTROS: Tudo o que não se encaixar.

O Schema JSON de saída deve sempre incluir "categoria". As chaves de cada categoria (ex: "operacoes" para B3, "dados_declaracao_anterior" para DECLARACAO_ANTERIOR) devem ser preenchidas quando aplicável.

SCHEMA DE SAÍDA BASE (Exemplo da estrutura esperada baseada na categoria):
{
  "categoria": "DECLARACAO_ANTERIOR",
  "descricao_generica": "Resumo da declaração base",
  "dados_declaracao_anterior": {
    "ano_exercicio": "2024",
    "total_bens_direitos": 150000.00,
    "dependentes_identificados": 3
  }
}
`;

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
      model: 'gemini-3.0-pro', 
      systemInstruction: systemPrompt,
      generationConfig: { 
        temperature: 0, 
        responseMimeType: 'application/json' 
      },
    });

    const result = await model.generateContent([inlineData, "Extrair dados operacionais e financeiros deste documento via schema taxado."]);
    const textResponse = result.response.text();
    
    // Regra de resiliência: Blindagem manual contra quebras de linha literais
    const cleanedTextResponse = textResponse.replace(/[\x00-\x1F]+/g, '');
    const parsedData = JSON.parse(cleanedTextResponse);
    const safeData = UniversalDocumentSchema.parse(parsedData);

    return NextResponse.json(safeData);

  } catch (error: any) {
    if (error.status === 429 || error.message?.includes('429')) {
       return NextResponse.json({ error: 'Rate limit excedido na API de Inteligência.' }, { status: 429 });
    }
    
    return NextResponse.json({ error: 'Falha na avaliação e extração estrutural do documento financeiro.' }, { status: 500 });
  }
}