import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é um Analista Fiscal Especialista na Declaração do IRPF 2025/2026.
O seu propósito é analisar documentos e devolver ESTRITAMENTE um ARRAY JSON válido.

ESTRUTURA DE SAÍDA EXIGIDA:
[
  {
    "ficha": "Nome da Ficha no PGD",
    "dados": { "chave_amigavel": "Valor a ser copiado" }
  }
]

LÓGICA DO PLANO DE AÇÃO (GUIA PASSO A PASSO):
- Se identificar a Declaração de Ajuste Anual anterior e/ou recibos novos, crie OBRIGATORIAMENTE como PRIMEIRO objeto do array a ficha "Plano de Ação".
- Nos "dados", você deve criar UMA ÚNICA CHAVE chamada "tarefas" contendo um ARRAY de objetos com esta estrutura exata:
  "tarefas": [
    {
      "titulo": "Resumo da ação (ex: Adicionar Veículo ONIX)",
      "caminho": "CAMINHO EXATO NO PGD (ex: Ficha Bens e Direitos > Grupo 02 - Bens Móveis > Código 01 - Veículo automotor terrestre)",
      "detalhes": "Passo a passo detalhado, informando exatamente os valores e a discriminação a preencher."
    }
  ]

REGRAS GERAIS:
1. Os caminhos ("caminho") DEVEM ser exatos ao menu do programa da Receita Federal.
2. BENS - VEÍCULOS: O "situacao_ano_atual" = total EFETIVAMENTE pago até 31/12. Se houver troca, gerar um objeto separado dando BAIXA no antigo (situacao_ano_atual = 0.00).
3. Substitua valores ilegíveis por null. Documentos sem cunho fiscal retornam [].`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('documents') as File[];

    if (!files || files.length === 0) return NextResponse.json({ error: 'Nenhum documento.' }, { status: 400 });

    const fileParts = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        return { inlineData: { data: base64Data, mimeType: file.type } };
      })
    );

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview', 
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    });

    const result = await model.generateContent([...fileParts, "Extrair dados e gerar guia prático de preenchimento em JSON."]);
    return NextResponse.json(JSON.parse(result.response.text()));
    
  } catch (error) {
    console.error('Erro na extração:', error);
    return NextResponse.json({ error: 'Falha ao processar.' }, { status: 500 });
  }
}