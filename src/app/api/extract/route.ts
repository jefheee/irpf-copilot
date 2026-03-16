import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é um Auditor Fiscal Sênior especialista em IRPF 2025/2026.
O seu trabalho é cruzar a Declaração do Ano Anterior (PASSADO) com os Recibos do Ano Atual (PRESENTE).

VOCÊ DEVE RETORNAR ESTRITAMENTE UM OBJETO JSON COM AS 3 CHAVES ABAIXO:

{
  "documentos_pendentes": [
    "Lista de strings informando QUAIS documentos do PASSADO faltam ser enviados no PRESENTE. Ex: 'Informe de Rendimentos do Banco Itaú (Conta X)', 'Extrato da Binance para os Bitcoins'."
  ],
  "plano_acao": [
    {
      "titulo": "Ação específica e isolada (ex: Adicionar Chevrolet Onix)",
      "caminho": "MENU EXATO NO PGD: Identificação do Contribuinte, Dependentes, Rendimentos Tributáveis Recebidos de Pessoa Jurídica, Rendimentos Isentos e Não Tributáveis, Rendimentos Sujeitos à Tributação Exclusiva/Definitiva, Pagamentos Efetuados, Bens e Direitos, Dívidas e Ônus Reais.",
      "detalhes": "Passo a passo exato do que preencher. NUNCA junte ações de Fichas diferentes na mesma tarefa. Se houve troca de carro, crie UMA tarefa para dar baixa no antigo e OUTRA para adicionar o novo."
    }
  ],
  "fichas": [
    {
      "ficha": "Nome Exato da Ficha",
      "dados": { "Campo": "Valor formatado em R$" }
    }
  ]
}

REGRAS DE AUDITORIA (CRÍTICO):
1. CARROS/TROCA: Se nas imagens houver compra de carro com veículo dado na troca, você OBRIGATORIAMENTE tem que gerar uma tarefa de BAIXA do veículo antigo (situacao_ano_atual = R$ 0,00) e uma de INCLUSÃO do novo.
2. VALORES: Formate todos os valores financeiros para string no padrão "R$ 1.500,00".
3. FOCO: Não resuma tarefas. Seja granular. Um item bancário = Uma tarefa.`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const baseDocument = formData.get('baseDocument') as File | null;
    const receipts = formData.getAll('receipts') as File[];

    if (!baseDocument && receipts.length === 0) return NextResponse.json({ error: 'Nenhum documento.' }, { status: 400 });

    const parts: any[] = [];

    if (baseDocument) {
      parts.push("=== DECLARAÇÃO BASE DO ANO ANTERIOR (PASSADO) ===");
      if (baseDocument.type === 'application/json' || baseDocument.name.endsWith('.json')) {
        const jsonText = await baseDocument.text();
        parts.push(`Dados do ano anterior:\n${jsonText}`);
      } else {
        const arrayBuffer = await baseDocument.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: baseDocument.type } });
      }
    }

    if (receipts.length > 0) {
      parts.push("=== RECIBOS E CONTRATOS DO ANO ATUAL (NOVIDADES) ===");
      for (const file of receipts) {
        const arrayBuffer = await file.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: file.type } });
      }
    }

    parts.push("Cruze os dados. Identifique o que falta (documentos_pendentes), o que mudou (plano_acao isolando cada operação como a troca do carro) e os dados brutos (fichas). Retorne APENAS o JSON.");

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