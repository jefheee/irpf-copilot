import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é um Analista Fiscal Especialista na Declaração do IRPF 2025/2026.
O seu propósito é analisar documentos enviados pelo utilizador (Recibos, Informes, PDFs de Declarações Anteriores) e devolver ESTRITAMENTE um ARRAY JSON válido, sem qualquer formatação Markdown ou texto extra.

ESTRUTURA DE SAÍDA EXIGIDA:
[
  {
    "ficha": "Nome da Ficha no PGD",
    "dados": { "chave_amigavel": "Valor a ser copiado" }
  }
]

REGRAS GERAIS DE NEGÓCIO:
1. NOMENCLATURA: Grupos e Códigos devem incluir o número e o nome exato (ex: "02 - Bens Móveis", "01 - Veículo automotor terrestre", "26 - Plano de Saúde no Brasil").
2. VALORES NÃO ENCONTRADOS: Se uma informação for ilegível, retorne 'null'. Se o arquivo não tiver cariz financeiro/fiscal, retorne [].

LÓGICA DO "PLANO DE AÇÃO" (DELTA):
- Se identificar a "Declaração de Ajuste Anual" de um ano anterior E documentos novos, crie como PRIMEIRO objeto do array uma ficha chamada "Plano de Ação (Resumo)".
- Nos "dados" desta ficha, liste tarefas numeradas do que o usuário deve fazer (ex: "tarefa_01": "Atualizar o saldo da conta X para R$ Y", "tarefa_02": "Dar baixa no veículo antigo RENAULT LOGAN e adicionar o novo ONIX", "tarefa_03": "Adicionar informe do plano de saúde").

REGRAS ESPECÍFICAS DE FICHAS:
- BENS - VEÍCULOS (02/01): Discriminação em MAIÚSCULAS com Marca/Modelo, Ano, Placa, CNPJ/Nome Vendedor e Forma de Pagamento. O "situacao_ano_atual" = total EFETIVAMENTE pago até 31/12 (Entrada + Parcelas). Se houver veículo dado na troca, gerar um objeto separado dando BAIXA (situacao_ano_atual = 0.00).
- BENS - CRIPTOATIVOS: Bitcoin (08/01), Altcoins (08/02), Stablecoins (08/03). Se for exchange estrangeira (ex: Binance), usar país de sede (ex: Japão).
- EXTERIOR (ex: Nomad): Ações nos EUA (03/01). Gerar objeto para Bens, objeto para "Rendimentos Recebidos do Exterior" e, OBRIGATORIAMENTE, um objeto para "Imposto Pago no Exterior" referente aos impostos retidos na fonte informados.
- OPERAÇÕES B3 E FIIs: Ações (03/01), FIIs (07/03), ETFs (07/08). Direcionar Dividendos para "Rendimentos Isentos" e JSCP para "Tributação Exclusiva".
- RENDIMENTOS PJ E CONSÓRCIO: Extrair CNPJ, Nome, Rendimentos, Previdência, IRRF e 13º Salário estritamente como vêm no informe.`;

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
          inlineData: { data: base64Data, mimeType: file.type },
        };
      })
    );

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview', 
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    });

    const result = await model.generateContent([...fileParts, "Extrair dados e gerar delta se aplicável."]);
    const jsonText = result.response.text();
    
    return NextResponse.json(JSON.parse(jsonText));
    
  } catch (error) {
    console.error('Erro na extração:', error);
    return NextResponse.json({ error: 'Falha ao processar.' }, { status: 500 });
  }
}