'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { FileText, Landmark, Briefcase, Car, AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export type PolymorphicDocumentType = 'B3_NOTE' | 'INCOME_STATEMENT' | 'ASSET_PURCHASE' | 'PREVIOUS_DECLARATION' | 'UNKNOWN';

export interface B3Transaction {
  ticker: string;
  quantidade: number;
  precoUnitario: number;
  dataOperacao: string;
  tipoOperacao: 'C' | 'V';
  tipoMercado?: string;
}

export interface PolymorphicDocument {
  documentType: PolymorphicDocumentType;
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

interface FinancialWhiteboardProps {
  data: PolymorphicDocument[];
}

// FORMATTER HELPER
const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// Minimalist Design Wrapper
const CardWrapper = ({ children, icon: Icon, title, subtitle }: any) => (
  <div className="finance-card bg-[#121214] border border-zinc-800 rounded-2xl p-8 transition-colors duration-300 hover:border-zinc-700">
    <div className="flex gap-6 items-start">
      <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800/80 text-zinc-300">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 w-full">
        <div className="mb-8">
          <h3 className="text-xl font-medium text-zinc-100 tracking-tight">{title}</h3>
          {subtitle && <p className="text-zinc-500 font-mono text-xs mt-2 uppercase tracking-wider">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  </div>
);

const renderIncomeStatement = (doc: PolymorphicDocument, idx: number) => {
  const inc = doc.income_data;
  if (!inc) return null;
  return (
    <CardWrapper key={idx} icon={Briefcase} title="Informe de Rendimentos" subtitle={`Fonte: ${inc.nome_fonte_pagadora || 'N/A'} (CNPJ: ${inc.cnpj_fonte_pagadora || 'N/A'})`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">Rendimentos Tributáveis</p>
          <p className="text-xl text-zinc-100 font-medium">{formatCurrency(inc.rendimentos_tributaveis || 0)}</p>
        </div>
        <div className="p-5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">Previdência (INSS)</p>
          <p className="text-xl text-zinc-300 font-medium">{formatCurrency(inc.previdencia_oficial || 0)}</p>
        </div>
        <div className="p-5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">Imposto Retido</p>
          <p className="text-xl text-zinc-300 font-medium">{formatCurrency(inc.imposto_retido || 0)}</p>
        </div>
      </div>
    </CardWrapper>
  );
}

const renderAssetPurchase = (doc: PolymorphicDocument, idx: number) => {
  const ast = doc.asset_data;
  if (!ast) return null;
  return (
    <CardWrapper key={idx} icon={Car} title="Aquisição de Bem" subtitle={`Mapeado para Código RFB: ${ast.codigo_rfb || '??'}`}>
      <div className="space-y-6">
        <div className="p-5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Descrição</p>
          <p className="text-base text-zinc-200">{ast.descricao || 'Não informada'}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">Valor de Aquisição</p>
            <p className="text-xl text-zinc-100 font-medium">{formatCurrency(ast.valor_aquisicao || 0)}</p>
          </div>
          <div className="p-5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">CPF/CNPJ do Vendedor</p>
            <p className="text-base font-mono text-zinc-300 mt-2">{ast.cpf_cnpj_vendedor || 'N/A'}</p>
          </div>
        </div>
      </div>
    </CardWrapper>
  );
}

const renderPreviousDeclaration = (doc: PolymorphicDocument, idx: number) => {
  const dec = doc.declaration_data;
  if (!dec) return null;
  return (
    <CardWrapper key={idx} icon={FileText} title="Declaração Anterior" subtitle="Histórico Importado (Ano-Calendário Prévio)">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">Bens e Direitos</p>
          <p className="text-xl text-zinc-100 font-medium">{formatCurrency(dec.total_bens_direitos || 0)}</p>
        </div>
        <div className="p-5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">Dívidas e Ônus</p>
          <p className="text-xl text-zinc-300 font-medium">{formatCurrency(dec.total_dividas || 0)}</p>
        </div>
        <div className="p-5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">Dependentes</p>
          <p className="text-xl text-zinc-300 font-medium">{dec.dependentes_identificados || 0}</p>
        </div>
      </div>
    </CardWrapper>
  );
}

const renderB3Note = (doc: PolymorphicDocument, idx: number) => {
  const b3 = doc.b3_data;
  const analysis = doc.b3_math_analysis;
  if (!b3) return null;

  return (
    <CardWrapper key={idx} icon={Landmark} title="Nota de Corretagem (B3)" subtitle={`${b3.corretora || 'Corretora'} • Data: ${b3.data || 'N/A'}`}>
      {analysis && (
        <div className="space-y-8">
          {/* Day Trades */}
          {analysis.dayTradesIdentificados && analysis.dayTradesIdentificados.length > 0 && (
            <div>
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4 border-b border-zinc-800/60 pb-2">Day Trade (Curtíssimo Prazo)</p>
              <div className="grid grid-cols-1 gap-3">
                {analysis.dayTradesIdentificados.map((t, i) => (
                  <div key={i} className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/40">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded bg-zinc-800 text-zinc-300">
                        {t.tipoOperacao === 'C' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-zinc-200 font-medium text-lg">{t.ticker}</p>
                        <p className="text-zinc-500 text-xs font-mono mt-1 uppercase">{t.tipoOperacao === 'C' ? 'Compra' : 'Venda'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-300 font-medium">{formatCurrency((t.precoUnitario * t.quantidade))}</p>
                      <p className="text-zinc-500 text-xs font-mono mt-1">{t.quantidade} cotas a {formatCurrency(t.precoUnitario)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Swing Trades */}
          {analysis.swingTradesRemanescentes && analysis.swingTradesRemanescentes.length > 0 && (
            <div>
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4 border-b border-zinc-800/60 pb-2">Swing Trade / Custódia</p>
              <div className="grid grid-cols-1 gap-3">
                {analysis.swingTradesRemanescentes.map((t, i) => (
                  <div key={i} className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/40">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded bg-zinc-800 text-zinc-300">
                        {t.tipoOperacao === 'C' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-zinc-300 font-medium text-lg">{t.ticker}</p>
                        <p className="text-zinc-500 text-xs font-mono mt-1 uppercase">{t.tipoOperacao === 'C' ? 'Compra' : 'Venda'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-400 font-medium">{formatCurrency((t.precoUnitario * t.quantidade))}</p>
                      <p className="text-zinc-500 text-xs font-mono mt-1">{t.quantidade} cotas a {formatCurrency(t.precoUnitario)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </CardWrapper>
  );
}

const renderUnknown = (doc: PolymorphicDocument, idx: number) => {
  return (
    <CardWrapper key={idx} icon={AlertTriangle} title="Documento Não Mapeado" subtitle="Ausência de Padrão Sistêmico">
      <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800/50 border-l-2 border-l-zinc-500">
        <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
          Nenhuma estrutura rígida de Nota, Extrato RH ou Bens Cobertos foi parametrizada para este anexo. As informações contidas ali estarão disponíveis via chat humanizado com o arquiteto fiscal.
        </p>
      </div>
    </CardWrapper>
  );
}

export default function FinancialWhiteboard({ data }: FinancialWhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (data.length > 0) {
      const cards = gsap.utils.toArray('.finance-card');
      const lastCard = cards[cards.length - 1] as HTMLElement;

      gsap.fromTo(lastCard,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, { dependencies: [data], scope: containerRef });

  if (data.length === 0) return null;

  return (
    <div ref={containerRef} className="w-full flex-1 overflow-y-auto px-6 md:px-10 py-8 custom-scrollbar space-y-8 bg-[#121214]">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest font-sans">Mesa de Auditoria</h2>
        <span className="flex items-center gap-2 text-zinc-300 text-xs font-medium font-sans tracking-wide">
          <CheckCircle2 className="w-4 h-4 text-zinc-500" />
          {data.length} PROCESSADO(S)
        </span>
      </div>

      <div className="space-y-6 pb-12">
        {data.map((doc, idx) => {
          switch (doc.documentType) {
            case 'INCOME_STATEMENT': return renderIncomeStatement(doc, idx);
            case 'ASSET_PURCHASE': return renderAssetPurchase(doc, idx);
            case 'PREVIOUS_DECLARATION': return renderPreviousDeclaration(doc, idx);
            case 'B3_NOTE': return renderB3Note(doc, idx);
            case 'UNKNOWN':
            default:
              return renderUnknown(doc, idx);
          }
        })}
      </div>
    </div>
  );
}
