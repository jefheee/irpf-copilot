import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

export async function POST(req: Request) {
  try {
    const { message, contextData } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });
    }

    const systemInstruction = `Você é o IRPF Copilot, um assistente virtual especialista em Imposto de Renda.
Você tem acesso aos dados extraídos dos documentos do usuário no formato JSON abaixo:
${JSON.stringify(contextData)}

Instruções:
1. Responda às dúvidas do usuário de forma clara, amigável e direta, baseando-se EXCLUSIVAMENTE nos dados fornecidos acima.
2. Se o usuário perguntar algo que não está nos dados, informe que não encontrou essa informação nos documentos enviados.
3. Não utilize formatação Markdown complexa, use apenas parágrafos curtos, listas simples ou negrito para destacar valores.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction,
      generationConfig: { temperature: 0.2 }, // Um pouco de temperatura para a conversa fluir natural
    });

    const result = await model.generateContent(message);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
    
  } catch (error) {
    console.error('Erro no chat:', error);
    return NextResponse.json({ error: 'Falha ao conectar com o assistente.' }, { status: 500 });
  }
}