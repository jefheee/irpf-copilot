import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

const systemPrompt = `Você é um Auditor Fiscal Sênior especialista no IRPF 2026 (Ano-Calendário 2025).
Sua missão é atuar como um motor de "Intelligent Document Processing" (IDP). Extraia dados de PDFs e imagens com precisão cirúrgica, focando em MAXIMIZAR A RESTITUIÇÃO e blindar o usuário contra a malha fina.

RETORNE ESTRITAMENTE UM OBJETO JSON COM ESTAS 4 CHAVES:

{
  "documentos_pendentes": [
    "Avisos críticos. Ex: 'Falta o CNPJ no recibo do dentista X', 'O recibo de farmácia Y não é dedutível e foi ignorado', 'Faltam os informes bancários'."
  ],
  "plano_acao": [
    {
      "titulo": "Ação (Ex: Lançar Despesa Médica - Dr. Silva)",
      "caminho": "Ficha: Pagamentos Efetuados > Código XX",
      "detalhes": "1. Clique em 'Novo'.\\n2. Insira o CPF/CNPJ: 000.000.000-00.\\n3. No campo Valor, insira o total: R$ YY. (USE SEMPRE ESTE FORMATO DE LISTA COM QUEBRAS DE LINHA '\\n')."
    }
  ],
  "fichas": [
    {
      "ficha": "Nome Oficial da Ficha",
      "dados": { "Nome do Campo": "Valor" }
    }
  ],
  "otimizacao_futura": "Uma dica proativa de planejamento financeiro/tributário para o próximo ano. Analise a renda e os gastos. Exemplo: sugerir abertura de previdência PGBL para reduzir a base de cálculo, guardar notas fiscais específicas, etc. Seja direto e mostre o impacto financeiro."
}

REGRAS DE AUDITORIA (CRÍTICO):
1. CAÇA ÀS DEDUÇÕES: Vasculhe as imagens por despesas médicas, planos de saúde e educação. Extraia OBRIGATORIAMENTE o CNPJ/CPF do prestador.
2. CONSOLIDAÇÃO INTELIGENTE: Se houver múltiplos recibos do mesmo prestador, SOME os valores e crie APENAS UM item no 'plano_acao' com o valor total.
3. FILTRO DE MALHA FINA: Ignore despesas com farmácia, academia ou material escolar para o 'plano_acao', mas avise em 'documentos_pendentes' que estes não são dedutíveis.
4. BENS FINANCIADOS: Para veículos ou imóveis financiados, instrua a declarar APENAS o valor pago no ano. Nunca o valor total.
5. PLANEJAMENTO (NOVO): Utilize a chave 'otimizacao_futura' para entregar um conselho de alto valor que mude a vida financeira do usuário no próximo ano.`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const baseDocument = formData.get('baseDocument') as File | null;
    const receipts = formData.getAll('receipts') as File[];

    if (!baseDocument && receipts.length === 0) return NextResponse.json({ error: 'Nenhum documento.' }, { status: 400 });

    const parts: any[] = [];
    if (baseDocument) {
      if (baseDocument.type === 'application/json' || baseDocument.name.endsWith('.json')) {
        parts.push(`=== PASSADO ===\n${await baseDocument.text()}`);
      } else {
        const ab = await baseDocument.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(ab).toString('base64'), mimeType: baseDocument.type } });
      }
    }

    if (receipts.length > 0) {
      parts.push("=== PRESENTE ===");
      for (const file of receipts) {
        const ab = await file.arrayBuffer();
        parts.push({ inlineData: { data: Buffer.from(ab).toString('base64'), mimeType: file.type } });
      }
    }

    parts.push("Mapeie a evolução. No plano_acao, gere o passo a passo com QUEBRAS DE LINHA (\\n).");

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview', systemInstruction: systemPrompt, generationConfig: { temperature: 0, responseMimeType: 'application/json' }});
    const result = await model.generateContent(parts);
    return NextResponse.json(JSON.parse(result.response.text()));
  } catch (error) {
    return NextResponse.json({ error: 'Falha.' }, { status: 500 });
  }
}