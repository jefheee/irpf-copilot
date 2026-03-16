import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é um Analista Fiscal Especialista em IRPF 2025/2026.
O seu propósito é cruzar os dados da declaração do ano passado com os novos recibos e criar um JSON ESTRITO.

ESTRUTURA DE SAÍDA EXIGIDA:
[
  {
    "ficha": "Nome da Ficha",
    "dados": { "chave_amigavel": "Valor a ser copiado" }
  }
]

PLANO DE AÇÃO (GUIA PASSO A PASSO OBRIGATÓRIO SE HOUVER ARQUIVOS):
Crie como PRIMEIRO objeto do array a ficha "Plano de Ação".
"dados": {
  "tarefas": [
    {
      "titulo": "Resumo (ex: Declarar Veículo ONIX)",
      "caminho": "MENU EXATO DO APP (Use EXATAMENTE um destes nomes: Identificação do Contribuinte, Dependentes, Rendimentos Tributáveis Recebidos de Pessoa Jurídica, Rendimentos Isentos e Não Tributáveis, Rendimentos Sujeitos à Tributação Exclusiva/Definitiva, Pagamentos Efetuados, Bens e Direitos, Dívidas e Ônus Reais) > Botão 'Novo'",
      "detalhes": "Escreva um guia natural, em português, dizendo ao usuário EXATAMENTE o que preencher e em qual campo. Exemplo: '1. No campo CNPJ, digite X. 2. No campo Discriminação, cole o texto Y. 3. No campo Situação em 31/12, digite o valor de R$ Z'. NUNCA use formato JSON aqui."
    }
  ]
}`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('documents') as File[];

    if (!files || files.length === 0) return NextResponse.json({ error: 'Nenhum documento.' }, { status: 400 });

    const fileParts = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return { inlineData: { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: file.type } };
      })
    );

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview', 
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    });

    const result = await model.generateContent([...fileParts, "Crie as tarefas usando os menus exatos da barra lateral do IRPF e detalhe o passo a passo em linguagem natural."]);
    return NextResponse.json(JSON.parse(result.response.text()));
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao processar.' }, { status: 500 });
  }
}