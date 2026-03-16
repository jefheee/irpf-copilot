import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é um Analista Fiscal Especialista na Declaração do IRPF 2025/2026.
O seu propósito é analisar documentos enviados pelo utilizador e devolver ESTRITAMENTE um ARRAY JSON válido.

ESTRUTURA DE SAÍDA EXIGIDA:
[
  {
    "ficha": "Nome da Ficha no PGD",
    "dados": { "chave_amigavel": "Valor a ser copiado" }
  }
]

LÓGICA DO "PLANO DE AÇÃO":
- Se identificar a Declaração de Ajuste Anual anterior e/ou recibos novos, crie como PRIMEIRO objeto do array a ficha "Plano de Ação (Resumo)".
- Nos "dados", liste as tarefas detalhadas. Junte a dica com os dados a preencher. 
- Exemplo: "tarefa_01": "Vá na ficha 'Bens e Direitos', código '01 - Veículo', e adicione o ONIX PLACA XYZ. Use esta discriminação exata: [inserir texto longo]. No campo Situação em 31/12, coloque o valor R$ X (que é a soma da entrada + parcelas pagas)."

REGRAS GERAIS:
1. Códigos devem incluir número e nome exato (ex: "02 - Bens Móveis").
2. BENS - VEÍCULOS: O "situacao_ano_atual" = total EFETIVAMENTE pago até 31/12. Se houver troca, gerar um objeto separado dando BAIXA no antigo (situacao_ano_atual = 0.00).
3. EXTERIOR: Gerar objeto para Bens, Rendimentos e, OBRIGATORIAMENTE, um para "Imposto Pago no Exterior".
4. Substitua valores ilegíveis por null. Documentos sem cunho fiscal retornam [].`;

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

    const result = await model.generateContent([...fileParts, "Extrair dados e gerar guia prático de preenchimento."]);
    return NextResponse.json(JSON.parse(result.response.text()));
    
  } catch (error) {
    console.error('Erro na extração:', error);
    return NextResponse.json({ error: 'Falha ao processar.' }, { status: 500 });
  }
}