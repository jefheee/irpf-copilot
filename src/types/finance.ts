export interface Operation {
  ticker: string;
  tipo: 'COMPRA' | 'VENDA';
  classificacao: 'DAY_TRADE' | 'OPERACAO_COMUM';
  quantidade: number;
  preco_unitario: number;
  valor_total_rateado: number;
}

export type DocumentCategory = 'B3' | 'SAUDE' | 'EDUCACAO' | 'IDENTIFICACAO' | 'DECLARACAO_ANTERIOR' | 'OUTROS';

export interface UniversalDocument {
  categoria: DocumentCategory;
  descricao_generica?: string;
  
  // B3 Specific
  data_pregao?: string;
  corretora?: string;
  operacoes?: Operation[];
  eventos_pendentes?: boolean;
  
  // Generic Invoice / Others
  data_emissao?: string;
  emissor?: string;
  valor_total?: number;

  // Declaracao Anterior Specific
  dados_declaracao_anterior?: {
    ano_exercicio: string | null;
    total_bens_direitos: number | null;
    dependentes_identificados: number | null;
  };
}

// Retro-compatibility (or alias) for the old B3 struct used downstream
export interface BrokerageNote extends UniversalDocument {
  categoria: 'B3';
  data_pregao: string;
  corretora: string;
  operacoes: Operation[];
  eventos_pendentes: boolean;
}
