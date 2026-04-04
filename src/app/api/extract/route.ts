import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import Groq from 'groq-sdk';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { B3BrokerageNote } from '../../../types/b3';
import { diluteFees, matchDayTrade, calculateTaxes } from '../../../lib/guards/b3_guard';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

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
        const pdfDocument = await pdfjsLib.getDocument(new Uint8Array(buffer)).promise;
        let extractedText = '';
        for (let i = 1; i <= pdfDocument.numPages; i++) {
          const page = await pdfDocument.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          extractedText += pageText + '\n';
        }
        rawText = extractedText;
      } catch (pdfError) {
        console.error("Erro no pdfjs-dist:", pdfError);
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
          "Transcreva todo o texto presente nesta imagem exatamente como aparece. Não formate, não resuma, apenas extraia o texto bruto."
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

    // Estágio 2: Extração Semântica e Estruturada (Smart Brain via Groq)
    // Usamos o zodToJsonSchema para forçar o output JSON restrito
    const groqSystemPrompt = `${systemPrompt}\n\nDEVOLVA ESTRITAMENTE EM FORMATO JSON OBRIGATÓRIO SEGUINDO ESTE SCHEMA:\n${JSON.stringify(zodToJsonSchema(UniversalDocumentSchema as any))}\n\nYou must respond in valid JSON format matching the exact schema provided.`;

    let textResponse = '';
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: groqSystemPrompt },
          { role: 'user', content: rawText }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        response_format: { type: 'json_object' }
      });

      textResponse = chatCompletion.choices[0]?.message?.content || '{}';
    } catch (apiError: any) {
      if (apiError.status === 429 || apiError.message?.includes('429') || apiError.message?.toLowerCase().includes('quota')) {
        return NextResponse.json({ error: 'RATE_LIMIT', message: 'Limite da API Groq atingido.' }, { status: 429 });
      }
      throw apiError;
    }

    let parsedData;
    let safeData;
    try {
      parsedData = JSON.parse(textResponse);
      safeData = UniversalDocumentSchema.parse(parsedData);
    } catch (parseError: any) {
      console.error("[Parse Error]:", parseError);
      return NextResponse.json({ error: 'Falha no processamento (Parse/Zod) da resposta da IA.', details: parseError.message }, { status: 500 });
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