import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

export async function POST(req: Request) {
  try {
    const { message, contextData } = await req.json();

    if (!message) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });

    const systemInstruction = `Você é o IRPF Copilot, um assistente virtual especialista em Imposto de Renda.
Você tem acesso aos dados extraídos dos documentos do usuário no formato JSON abaixo:
${JSON.stringify(contextData)}

REGRAS DE POSTURA E RESPOSTA:
1. Seja EXTREMAMENTE claro, objetivo e amigável.
2. Responda APENAS com base nos dados JSON fornecidos. Se não souber, diga "Não encontrei essa informação nos documentos".
3. NÃO escreva textos gigantes. Use parágrafos curtos.
4. Você PODE usar formatação com duplo asterisco (**texto**) para destacar valores, nomes e campos importantes. Eu irei renderizar isso no front-end. Não use nenhuma outra formatação markdown.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction,
      generationConfig: { temperature: 0.1 }, 
    });

    const result = await model.generateContent(message);
    return NextResponse.json({ reply: result.response.text() });
    
  } catch (error) {
    console.error('Erro no chat:', error);
    return NextResponse.json({ error: 'Falha ao conectar com o assistente.' }, { status: 500 });
  }
}