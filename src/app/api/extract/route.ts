import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import PDFParser from 'pdf2json';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { B3BrokerageNote } from '../../../types/b3';
import { diluteFees, matchDayTrade, calculateTaxes } from '../../../lib/guards/b3_guard';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });

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

// 2. União Discriminada (A MÁGICA DO ROTEAMENTO SEGURO)
const UniversalDocumentSchema = z.discriminatedUnion('documentType', [
  B3Schema,
  IncomeStatementSchema,
  AssetPurchaseSchema,
  PreviousDeclarationSchema,
  UnknownSchema,
]);

const systemPrompt = `Você é um Auditor Fiscal sênior e um "Smart Router" de extração. É estritamente proibido resumir páginas. 
CLASSIFICAÇÃO OBRIGATÓRIA: Escolha apenas UM 'documentType' válido e preencha SOMENTE o schema correspondente estrito:
1) "B3_NOTE": Notas de corretagem na bolsa. Preencha 'b3_data' com cotações corretas, se é compra (C) ou venda (V) e taxas reais.
2) "INCOME_STATEMENT": Informes de rendimentos de RH. Preencha 'income_data' com CNPJ e Nome da fonte pagadora, rendimentos tributáveis (bruto), imposto de renda retido na fonte e INSS/Previdência deduzida.
3) "ASSET_PURCHASE": Compra ou venda de bens físicos (ex: veículos). Preencha 'asset_data'. Deduza automaticamente o código RFB correto (Ex: identificar um carro e classificar com código 21). Obtenha cpf/cnpj do vendedor e valor monetário de aquisição pago.
4) "UNKNOWN": Se for faturas velhas, PDF de cartão ou documentos soltos. Preencha 'dados_genericos'.
5) "PREVIOUS_DECLARATION": Declaração de Ajuste Anual completa do ano anterior. Extraia evolução patrimonial, dependentes e totais.
REGRA DE EXTRAÇÃO PROFUNDA: Varra linha por linha para obter valores numéricos corretos.`;

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
    const buffer = Buffer.from(arrayBuffer);

    let rawText = '';

    // Estágio 1: Extração de Texto Bruto (Dumb OCR/Vision)
    if (documentFile.type === 'application/pdf') {
      try {
        rawText = await new Promise((resolve, reject) => {
          const pdfParser = new (PDFParser as any)(null, 1);
          pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
          pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
          pdfParser.parseBuffer(buffer);
        }) as string;
      } catch (pdfError) {
        console.error("Erro no pdf2json:", pdfError);
        return NextResponse.json({ error: 'Falha ao ler o texto do PDF.' }, { status: 500 });
      }
    } else if (documentFile.type.startsWith('image/')) {
      const inlineData = {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: documentFile.type
        }
      };

      const visionModel = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { temperature: 0 },
      });

      try {
        const result = await visionModel.generateContent([
          inlineData,
          "Você é um extrator OCR de alta precisão. Transcreva TODO o texto desta imagem. Se houver tabelas, contas ou formulários, você DEVE preservar o alinhamento visual recriando a estrutura em formato de Tabela Markdown. Não resuma, extraia 100% dos dados brutos."
        ]);
        rawText = result.response.text();
      } catch (visionError: any) {
        if (visionError.status === 429 || visionError.message?.includes('429')) {
          return NextResponse.json({ error: 'RATE_LIMIT', message: 'Limite de visão da Google atingido.' }, { status: 429 });
        }
        throw visionError;
      }
    } else {
      return NextResponse.json({ error: 'Formato de ficheiro não suportado.' }, { status: 400 });
    }

    // Estágio 2: Extração Semântica e Estruturada (Smart Brain via Groq Vercel AI SDK com generateText)
    const schemaString = JSON.stringify(zodToJsonSchema(UniversalDocumentSchema as any));

    let safeData;
    try {
      const { text } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: `${systemPrompt}\n\nVocê é um Auditor Fiscal sênior. Extraia os dados ESTRITAMENTE de acordo com o JSON Schema abaixo.\n\nVOCÊ DEVE RESPONDER APENAS COM UM OBJETO JSON VÁLIDO E PREENCHER TODOS OS CAMPOS ANINHADOS (ex: declaration_data).\n\nSCHEMA:\n${schemaString}`,
        prompt: `Extraia os dados deste documento bruto: \n\n${rawText}`,
        temperature: 0
      });

      // Sanitização agressiva para remover preâmbulos, postâmbulos e blocos markdown
      let cleanText = text.replace(/```(?:json)?\n?/gi, '').replace(/```\n?/g, '').trim();
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      }

      // Força o parse seguro do texto retornado pela IA
      const parsedData = JSON.parse(cleanText);
      safeData = UniversalDocumentSchema.parse(parsedData);
    } catch (error: any) {
      console.error("[Groq/Zod Text Error]:", error);
      if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) {
        return NextResponse.json({ error: 'RATE_LIMIT', message: 'Limite da API Groq atingido.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Falha no processamento JSON/Zod.', details: error.message }, { status: 500 });
    }

    let finalResponse: any = safeData;

    // Roteamento Pós-Validação Zod Discriminado
    switch (safeData.documentType) {
      case 'B3_NOTE':
        // Motor Híbrido: Processa Day trades no TS
        const dilutedTransactions = diluteFees(safeData.b3_data);
        const matchResult = matchDayTrade(dilutedTransactions);

        finalResponse = {
          ...safeData,
          b3_math_analysis: {
            dayTradesIdentificados: matchResult.dayTrades,
            swingTradesRemanescentes: matchResult.swingTrades
          }
        };
        break;

      case 'INCOME_STATEMENT':
      case 'ASSET_PURCHASE':
      case 'PREVIOUS_DECLARATION':
      case 'UNKNOWN':
      default:
        // Outros documentos fluem de forma transparente pro frontend
        finalResponse = safeData;
        break;
    }

    return NextResponse.json(finalResponse);

  } catch (error: any) {
    console.error("[Extração Error]:", error);

    if (error.status === 429 || error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) {
      return NextResponse.json({ error: 'RATE_LIMIT', message: 'Limite de 2 RPM da API atingido. A tentar novamente...' }, { status: 429 });
    }

    return NextResponse.json({ error: 'Falha na avaliação e extração estrutural do documento financeiro.' }, { status: 500 });
  }
}