import { B3Transaction, B3BrokerageNote } from '../../types/b3';

/**
 * Dilui as taxas totais da nota no custo de cada transação proporcional ao volume financeiro.
 */
export function diluteFees(note: B3BrokerageNote): B3Transaction[] {
  const totalVolume = note.transacoes.reduce((acc, t) => acc + (t.quantidade * t.precoUnitario), 0);
  if (totalVolume === 0) return [...note.transacoes];

  const totalFees = note.taxaLiquidacao + note.emolumentos;

  return note.transacoes.map(t => {
    const volume = t.quantidade * t.precoUnitario;
    const feeShare = (volume / totalVolume) * totalFees;

    // Impacto no preco unitario (Contábil Básico)
    // Na compra, a taxa ENCARECE o custo.
    // Na venda, a taxa DIMINUI o que você recebe, logo encarece o "custo" para efeitos de abatimento no lucro.
    let adjustedPrice = t.precoUnitario;
    if (t.tipoOperacao === 'C') {
      adjustedPrice += (feeShare / t.quantidade);
    } else {
      adjustedPrice -= (feeShare / t.quantidade);
    }

    return {
      ...t,
      precoUnitario: Number(adjustedPrice.toFixed(4)) // Boa prática contábil: manter mais casas durante o trânsito longo
    };
  });
}

/**
 * Separa Day Trades e Swing Trades fracionando lotes se necessário, agrupados por data e ticker.
 */
export function matchDayTrade(transactions: B3Transaction[]): { dayTrades: B3Transaction[], swingTrades: B3Transaction[] } {
  const dayTrades: B3Transaction[] = [];
  const swingTrades: B3Transaction[] = [];

  // Group by Date and Ticker
  const groups: Record<string, { C: B3Transaction[], V: B3Transaction[] }> = {};

  for (const t of transactions) {
    const key = `${t.dataOperacao}_${t.ticker}`;
    if (!groups[key]) groups[key] = { C: [], V: [] };
    groups[key][t.tipoOperacao].push({ ...t }); // cloned to avoid mutations
  }

  for (const key in groups) {
    const group = groups[key];
    const totalComprado = group.C.reduce((sum, t) => sum + t.quantidade, 0);
    const totalVendido = group.V.reduce((sum, t) => sum + t.quantidade, 0);

    const matchQtd = Math.min(totalComprado, totalVendido);

    if (matchQtd === 0) {
      // Pure swing trade
      swingTrades.push(...group.C, ...group.V);
      continue;
    }

    // Process Day Trade Matching splitting original lots
    let remainingMatchC = matchQtd;
    for (const t of group.C) {
      if (remainingMatchC === 0) {
        swingTrades.push(t);
        continue;
      }
      if (t.quantidade <= remainingMatchC) {
        dayTrades.push({ ...t });
        remainingMatchC -= t.quantidade;
      } else {
        // Split
        dayTrades.push({ ...t, quantidade: remainingMatchC });
        swingTrades.push({ ...t, quantidade: t.quantidade - remainingMatchC });
        remainingMatchC = 0;
      }
    }

    let remainingMatchV = matchQtd;
    for (const t of group.V) {
      if (remainingMatchV === 0) {
        swingTrades.push(t);
        continue;
      }
      if (t.quantidade <= remainingMatchV) {
        dayTrades.push({ ...t });
        remainingMatchV -= t.quantidade;
      } else {
        // Split
        dayTrades.push({ ...t, quantidade: remainingMatchV });
        swingTrades.push({ ...t, quantidade: t.quantidade - remainingMatchV });
        remainingMatchV = 0;
      }
    }
  }

  return { dayTrades, swingTrades };
}

/**
 * Calcula o custo médio de aquisição. Apenas Compras atualizam o preço médio unitário.
 */
export function calculateAverageCost(ticker: string, transactions: B3Transaction[]): number {
  let quantityAccum = 0;
  let costAccum = 0;

  for (const t of transactions) {
    if (t.ticker !== ticker) continue;

    if (t.tipoOperacao === 'C') {
      quantityAccum += t.quantidade;
      costAccum += (t.quantidade * t.precoUnitario);
    } else if (t.tipoOperacao === 'V') {
      quantityAccum -= t.quantidade;
      if (quantityAccum < 0) quantityAccum = 0; // Proteção para ignorar descobertos em cálculo simplificado
    }
  }

  if (quantityAccum === 0) return 0;
  return Number((costAccum / quantityAccum).toFixed(2));
}

/**
 * Calcula o IR devido sobre o ganho final aferido de uma classe de operação.
 */
export function calculateTaxes(gains: number, isDayTrade: boolean): number {
  if (gains <= 0) return 0; // Prejuízo não paga imposto, estoca.
  const rate = isDayTrade ? 0.20 : 0.15;
  return Number((gains * rate).toFixed(2));
}
