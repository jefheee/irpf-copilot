import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é uma API de Extração de Dados Fiscais Brasileiros (IRPF 2025/2026).
O seu único propósito é analisar documentos enviados pelo utilizador (recibos, informes, faturas, contratos) e devolver um JSON estrito, mapeando os dados extraídos para as "Fichas" exatas do Programa Gerador da Declaração (PGD) da Receita Federal do Brasil.

REGRAS DE EXTRAÇÃO E CÁLCULO:
1. Formato de Saída: DEVE devolver EXCLUSIVAMENTE um objeto JSON válido. Sem formatação Markdown, sem introduções.
2. Identificação da Ficha: Avalie a natureza do documento para determinar a "Ficha" e o "Grupo/Código".
3. Regra de Bens e Direitos (Veículos - Código 02/01): 
   - A "Discriminação" deve ser um texto longo, em maiúsculas, contendo: MARCA/MODELO, ANO, PLACA, FORMA DE AQUISIÇÃO (se financiado, com ou sem troca), DADOS DO VENDEDOR (NOME e CNPJ/CPF), CONDIÇÕES DE PAGAMENTO.
   - O campo "situacao_ano_atual" NÃO é o valor de mercado. É a soma ESTRITA de todos os valores EFETIVAMENTE PAGOS até 31/12.
4. Regras Gerais: Substitua valores não encontrados ou ilegíveis por null.`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('document') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum documento enviado.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-pro-preview',
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      },
      "Processar documentos."
    ]);

    const jsonText = result.response.text();
    return NextResponse.json(JSON.parse(jsonText));
    
  } catch (error) {
    console.error('Erro na extração:', error);
    return NextResponse.json({ error: 'Falha ao processar o documento.' }, { status: 500 });
  }
}