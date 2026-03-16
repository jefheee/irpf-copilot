import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é um Analista Fiscal Especialista em IRPF.
O seu propósito é cruzar a declaração base (ano anterior) com os novos recibos (ano atual) e criar um JSON ESTRITO.

ESTRUTURA DE SAÍDA EXIGIDA:
[
  {
    "ficha": "Nome Exato da Ficha",
    "dados": { "chave_amigavel": "Valor a ser copiado" }
  }
]

PLANO DE AÇÃO (GUIA PASSO A PASSO OBRIGATÓRIO SE HOUVER MUDANÇAS):
Crie como PRIMEIRO objeto a ficha "Plano de Ação".
"dados": {
  "tarefas": [
    {
      "titulo": "Resumo (ex: Adicionar Veículo ONIX)",
      "caminho": "USE UM DESTES NOMES EXATOS: Identificação do Contribuinte, Dependentes, Rendimentos Tributáveis Recebidos de Pessoa Jurídica, Rendimentos Isentos e Não Tributáveis, Rendimentos Sujeitos à Tributação Exclusiva/Definitiva, Pagamentos Efetuados, Bens e Direitos, Dívidas e Ônus Reais > Botão 'Novo'",
      "detalhes": "Escreva um guia natural, em português, dizendo EXATAMENTE o que preencher e em qual campo. NUNCA use formato JSON aqui."
    }
  ]
}

REGRA DE FORMATAÇÃO MONETÁRIA (CRÍTICA):
TODO E QUALQUER valor financeiro (situação_ano_atual, rendimentos, impostos, parcelas) DEVE ser formatado nativamente como STRING no formato moeda brasileira. Exemplo: "R$ 84.940,00" ou "R$ 1.500,50". NUNCA retorne números inteiros flutuantes puros (ex: 84940).`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const baseDocument = formData.get('baseDocument') as File | null;
    const receipts = formData.getAll('receipts') as File[];

    if (!baseDocument && receipts.length === 0) return NextResponse.json({ error: 'Nenhum documento.' }, { status: 400 });

    const parts: any[] = [];

// Estratégia de Separação de Contexto Temporal
if (baseDocument) {
    parts.push("=== DECLARAÇÃO BASE DO ANO ANTERIOR (PASSADO) ===");
    
    // Se o utilizador enviar o db.json
    if (baseDocument.type === 'application/json' || baseDocument.name.endsWith('.json')) {
      const jsonText = await baseDocument.text();
      parts.push(`Dados estruturados do ano anterior:\n${jsonText}`);
    } else {
      // Se o utilizador enviar o PDF original
      const arrayBuffer = await baseDocument.arrayBuffer();
      parts.push({ inlineData: { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: baseDocument.type } });
    }
  }

    parts.push("Com base na documentação acima, extraia os dados, formate os valores financeiros em Reais (R$) e crie as tarefas usando os menus exatos da barra lateral do IRPF.");

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview', 
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(parts);
    return NextResponse.json(JSON.parse(result.response.text()));
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao processar.' }, { status: 500 });
  }
}