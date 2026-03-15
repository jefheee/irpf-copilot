import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é uma API de Extração de Dados Fiscais Brasileiros (IRPF 2025/2026).
O seu único propósito é analisar documentos enviados pelo utilizador (recibos, informes, faturas, contratos) e devolver um JSON estrito, mapeando os dados extraídos para as "Fichas" exatas do Programa Gerador da Declaração (PGD) da Receita Federal do Brasil.

REGRAS DE EXTRAÇÃO E CÁLCULO:
1. Formato de Saída Obrigatório: DEVE devolver EXCLUSIVAMENTE um ARRAY de objetos JSON. Sem formatação Markdown, sem introduções.
   Estrutura exata exigida:
   [
     {
       "ficha": "Nome da Ficha (ex: Bens e Direitos, Rendimentos Tributáveis)",
       "dados": {
         "chave_do_campo": "valor extraído"
       }
     }
   ]
2. Documentos Inválidos: Se o documento enviado não tiver relação com o Imposto de Renda ou comprovantes financeiros, retorne um array vazio: []
3. Regra de Bens e Direitos (Veículos - Código 02/01): 
   - A "Discriminação" deve ser um texto longo, em maiúsculas, contendo: MARCA/MODELO, ANO, PLACA, FORMA DE AQUISIÇÃO (se financiado, com ou sem troca), DADOS DO VENDEDOR (NOME e CNPJ/CPF), CONDIÇÕES DE PAGAMENTO.
   - O campo "situacao_ano_atual" NÃO é o valor de mercado. É a soma ESTRITA de todos os valores EFETIVAMENTE PAGOS até 31/12 (Entrada + parcelas pagas no ano).
4. Regras Gerais: Substitua valores não encontrados ou ilegíveis por null.`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('documents') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Nenhum documento enviado.' }, { status: 400 });
    }

    const fileParts = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        return {
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        };
      })
    );

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview', 
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent([
      ...fileParts,
      "Extrair dados em formato de array JSON."
    ]);

    const jsonText = result.response.text();
    return NextResponse.json(JSON.parse(jsonText));
    
  } catch (error) {
    console.error('Erro na extração:', error);
    return NextResponse.json({ error: 'Falha ao processar o documento.' }, { status: 500 });
  }
}