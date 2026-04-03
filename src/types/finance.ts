export interface Operation {
  ticker: string;
  tipo: 'COMPRA' | 'VENDA';
  classificacao: 'DAY_TRADE' | 'OPERACAO_COMUM';
  quantidade: number;
  preco_unitario: number;
  valor_total_rateado: number;
}

export type DocumentCategory = 'B3' | 'SAUDE' | 'EDUCACAO' | 'DECLARACAO_ANTERIOR' | 'CONTRATO_VEICULO' | 'RENDIMENTOS_RETIDOS' | 'OUTROS';

export interface UniversalDocument {
  categoria?: string | null;
  resumo_identificacao?: {
    titular_ou_dependente?: string | null;
    cpf_cnpj_envolvido?: string | null;
  };
  dados_financeiros_extensos?: {
    entidade_ou_ativo?: string | null;
    valor_identificado?: number | null;
    natureza?: string | null;
    data_fato_gerador?: string | null;
  }[] | null;
}

// Retro-compatibility (or alias) for the old B3 struct used downstream
export interface BrokerageNote extends UniversalDocument {
  categoria: 'B3';
  data_pregao: string;
  corretora: string;
  operacoes: Operation[];
  eventos_pendentes: boolean;
}
