export type UniversalDocumentType = 'B3_NOTE' | 'INCOME_STATEMENT' | 'ASSET_PURCHASE' | 'PREVIOUS_DECLARATION' | 'UNKNOWN';

export interface B3Transaction {
  ticker: string;
  quantidade: number;
  precoUnitario: number;
  dataOperacao: string;
  tipoOperacao: 'C' | 'V';
  tipoMercado?: string;
}

export interface UniversalDocument {
  documentType: UniversalDocumentType;
  // B3 Note
  b3_data?: {
    data: string;
    corretora: string;
  };
  b3_math_analysis?: {
    dayTradesIdentificados: B3Transaction[];
    swingTradesRemanescentes: B3Transaction[];
  };
  // Income Statement
  income_data?: {
    cnpj_fonte_pagadora: string;
    nome_fonte_pagadora: string;
    rendimentos_tributaveis: number;
    imposto_retido: number;
    previdencia_oficial: number;
  };
  // Asset
  asset_data?: {
    codigo_rfb: number;
    cpf_cnpj_vendedor: string;
    valor_aquisicao: number;
    descricao: string;
  };
  // Previous Declaration
  declaration_data?: {
    total_bens_direitos: number;
    total_dividas: number;
    dependentes_identificados: number;
  };
  // Unknown
  dados_genericos?: any[];
}
