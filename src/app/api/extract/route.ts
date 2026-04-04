import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { B3BrokerageNote } from '../../../types/b3';
import { diluteFees, matchDayTrade, calculateTaxes } from '../../../lib/guards/b3_guard';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

const UniversalDocumentSchema = z.object({
  categoria: z.string().nullable().optional(),
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

const systemPrompt = `Você é um Auditor Fiscal sênior. É estritamente proibido resumir ou pular páginas. REGRA DE EXTRAÇÃO PROFUNDA: Varra o documento linha por linha. Para CADA valor monetário (R$), CPF, CNPJ, contrato, veículo, imóvel ou rendimento retido encontrado, você DEVE obrigatoriamente criar uma entrada no array 'dados_financeiros_extensos'. A omissão de dados resultará em falha crítica do sistema de malha fina.`;

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

    // Parse direto, pois o modelo usa application/json nativamente
    const parsedData = JSON.parse(textResponse);
    const safeData = UniversalDocumentSchema.parse(parsedData);

    let finalResponse: any = safeData;

    // === INTEGRAÇÃO DEFENSIVA MSLR B3 (MOCK MVP) ===
    const isB3NoteMock = true; // Temporary flag for testing Day-Trade splits safely

    if (isB3NoteMock) {
      const mockNote: B3BrokerageNote = {
        data: "2025-01-10",
        corretora: "RICO",
        taxaLiquidacao: 2.50,
        emolumentos: 1.50,
        irrf: 0.10,
        transacoes: [
          { ticker: "MGLU3", quantidade: 1000, precoUnitario: 2.00, dataOperacao: "2025-01-10", tipoOperacao: "C" },
          { ticker: "MGLU3", quantidade: 600, precoUnitario: 2.50, dataOperacao: "2025-01-10", tipoOperacao: "V" }
        ]
      };

      const dilutedTransactions = diluteFees(mockNote);
      const matchResult = matchDayTrade(dilutedTransactions);

      // Simulação fake de ganhos
      const dtGains = 300; // Mockado para fins da TAREFA 3
      const taxes = calculateTaxes(dtGains, true);

      finalResponse = {
        ...safeData, // Extrator Universal Intocável
        b3_math_analysis: {
          notaBase: mockNote,
          dayTradesIdentificados: matchResult.dayTrades,
          swingTradesRemanescentes: matchResult.swingTrades,
          impostoAplicavelMock: taxes
        }
      };
    }

    return NextResponse.json(finalResponse);

  } catch (error: any) {
    console.error("[Extração Error]:", error);

    if (error.status === 429 || error.message?.includes('429')) {
      return NextResponse.json({ error: 'Rate limit excedido na API de Inteligência.' }, { status: 429 });
    }

    return NextResponse.json({ error: 'Falha na avaliação e extração estrutural do documento financeiro.' }, { status: 500 });
  }
}