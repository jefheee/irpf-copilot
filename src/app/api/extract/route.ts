import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";
import { diluteFees, matchDayTrade } from '../../../lib/guards/b3_guard';

// 1. Schemas Isolados (SEM .optional() para misturar contextos)
const B3Schema = z.object({
  documentType: z.literal('B3_NOTE'),
  b3_data: z.object({
    data: z.string(),
    corretora: z.string(),
    taxaLiquidacao: z.number(),
    emolumentos: z.number(),
    irrf: z.number(),
    transacoes: z.array(z.object({
      ticker: z.string(),
      quantidade: z.number(),
      precoUnitario: z.number(),
      dataOperacao: z.string(),
      tipoOperacao: z.enum(['C', 'V']),
      tipoMercado: z.enum(['Vista', 'Opções', 'Termo']).optional()
    }))
  })
});

const IncomeStatementSchema = z.object({
  documentType: z.literal('INCOME_STATEMENT'),
  income_data: z.object({
    cnpj_fonte_pagadora: z.string().nullable().optional(),
    nome_fonte_pagadora: z.string().nullable().optional(),
    rendimentos_tributaveis: z.number().nullable().optional(),
    imposto_retido: z.number().nullable().optional(),
    previdencia_oficial: z.number().nullable().optional()
  }),
});

const AssetPurchaseSchema = z.object({
  documentType: z.literal('ASSET_PURCHASE'),
  asset_data: z.object({
    codigo_rfb: z.number().nullable().optional(),
    cpf_cnpj_vendedor: z.string().nullable().optional(),
    placa_registro: z.string().nullable().optional(),
    valor_aquisicao: z.number().nullable().optional(),
    descricao_bem: z.string().nullable().optional()
  }),
});

const PreviousDeclarationSchema = z.object({
  documentType: z.literal('PREVIOUS_DECLARATION'),
  declaration_data: z.object({
    ano_exercicio: z.string().nullable().optional(),
    titular_nome: z.string().nullable().optional(),
    total_bens_direitos: z.number().nullable().optional(),
    total_dividas: z.number().nullable().optional(),
    dependentes_identificados: z.number().nullable().optional(),
    imposto_retido_total: z.number().nullable().optional()
  })
});

const UnknownSchema = z.object({
  documentType: z.literal('UNKNOWN'),
  dados_genericos: z.array(z.object({
    entidade_ou_ativo: z.string().nullable().optional(),
    valor_identificado: z.number().nullable().optional(),
    natureza: z.string().nullable().optional(),
    data_fato_gerador: z.string().nullable().optional()
  })).optional()
});

// 2. União Discriminada
const UniversalDocumentSchema = z.discriminatedUnion('documentType', [
  B3Schema,
  IncomeStatementSchema,
  AssetPurchaseSchema,
  PreviousDeclarationSchema,
  UnknownSchema,
]);

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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const fileType = documentFile.type;
    const arrayBuffer = await documentFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const schemaString = JSON.stringify(zodToJsonSchema(UniversalDocumentSchema as any));

    const prompt = `Você é um robô extrator de dados JSON.
A SUA ÚNICA FUNÇÃO É DEVOLVER UM OBJETO JSON VÁLIDO.
NÃO ESCREVA NENHUM TEXTO, APENAS O JSON.

PASSO 1: Analise o documento anexado.
PASSO 2: Determine o tipo exato do documento. VOCÊ É OBRIGADO a preencher a chave principal "documentType" com UM dos seguintes valores exatos:
- "PREVIOUS_DECLARATION" (Se for uma Declaração de Imposto de Renda)
- "INCOME_STATEMENT" (Se for um Informe de Rendimentos ou Contracheque)
- "ASSET_PURCHASE" (Se for uma compra de Veículo, Imóvel ou Recibo)
- "B3_NOTE" (Se for nota de corretagem)
- "UNKNOWN" (Se não for nada disso)

PASSO 3: Extraia os dados e coloque-os no bloco correto dentro do JSON, seguindo OBRIGATORIAMENTE esta estrutura e preenchendo todos os campos possíveis:
${schemaString}

Lembre-se: O JSON DEVE TER A CHAVE "documentType" NO PRIMEIRO NÍVEL.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: fileType } }
    ]);

    let responseText = result.response.text();
    // Sanitização contra blocos Markdown
    responseText = responseText.replace(/```(?:json)?\n?/gi, '').replace(/```\n?/g, '').trim();
    // Blindagem contra quebras de linha literais em JSON puro
    responseText = responseText.replace(/[\x00-\x1F]+/g, '');

    const safeData = UniversalDocumentSchema.parse(JSON.parse(responseText));

    let finalResponse: any = safeData;

    // Roteamento para pós-processamento de regras de negócios
    if (safeData.documentType === 'B3_NOTE') {
      const dilutedTransactions = diluteFees(safeData.b3_data);
      const matchResult = matchDayTrade(dilutedTransactions);

      finalResponse = {
        ...safeData,
        b3_math_analysis: {
          dayTradesIdentificados: matchResult.dayTrades,
          swingTradesRemanescentes: matchResult.swingTrades
        }
      };
    }

    return NextResponse.json(finalResponse);

  } catch (error: any) {
    console.error("[Extração Error]:", error);

    if (error.status === 429 || error.message?.includes('429')) {
      return NextResponse.json({ error: 'RATE_LIMIT', message: 'Limite atingido. A tentar novamente...' }, { status: 429 });
    }

    return NextResponse.json({ error: 'Falha na avaliação e extração.', details: error.message }, { status: 500 });
  }
}