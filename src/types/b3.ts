export type B3OperationType = 'C' | 'V';
export type B3MarketType = 'Vista' | 'Opções' | 'Termo';

export interface B3Transaction {
  id?: string;
  ticker: string;
  quantidade: number;
  precoUnitario: number;
  dataOperacao: string; // Formato YYYY-MM-DD
  tipoOperacao: B3OperationType;
  tipoMercado?: B3MarketType;
}

export interface B3BrokerageNote {
  data: string;
  corretora: string;
  transacoes: B3Transaction[];
  taxaLiquidacao: number;
  emolumentos: number;
  irrf: number; // Imposto de Renda Retido na Fonte (Dedo-Duro)
}
