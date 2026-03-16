import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

export async function POST(req: Request) {
  try {
    const { message, contextData } = await req.json();
    if (!message) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });

    const systemInstruction = `Você é o IRPF Copilot, um contador experiente.
O JSON abaixo contém TODO o contexto extraído dos documentos do usuário (incluindo o PDF da declaração do ano passado e os recibos novos):
${JSON.stringify(contextData)}

REGRAS:
1. O usuário VAI te perguntar sobre rendimentos e valores de anos anteriores. SEJA PROATIVO. Procure no JSON, some os valores se necessário e dê a resposta exata baseada nos arquivos enviados.
2. Se o usuário perguntar algo que realmente não existe nos dados, diga educadamente.
3. Responda em parágrafos curtos. Destaque valores com **negrito**. NUNCA use formatação JSON.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction,
      generationConfig: { temperature: 0.1 }, 
    });

    const result = await model.generateContent(message);
    return NextResponse.json({ reply: result.response.text() });
  } catch (error) {
    return NextResponse.json({ error: 'Falha no assistente.' }, { status: 500 });
  }
}