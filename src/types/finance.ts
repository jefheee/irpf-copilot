export interface Operation {
  ticker: string;
  tipo: 'COMPRA' | 'VENDA';
  classificacao: 'DAY_TRADE' | 'OPERACAO_COMUM';
  quantidade: number;
  preco_unitario: number;
  valor_total_rateado: number;
}

export interface BrokerageNote {
  data_pregao: string;
  corretora: string;
  operacoes: Operation[];
  eventos_pendentes: boolean;
}
