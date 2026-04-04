'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { BadgeAlert, Landmark, Briefcase, Car, AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export type PolymorphicDocumentType = 'B3_NOTE' | 'INCOME_STATEMENT' | 'ASSET_PURCHASE' | 'UNKNOWN';

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
    descricao_bem: string;
    placa_registro?: string;
  };
  // Unknown
  dados_genericos?: any[];
}

interface FinancialWhiteboardProps {
  data: PolymorphicDocument[];
}

// FORMATTER HELPER
const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const renderIncomeStatement = (doc: PolymorphicDocument, idx: number) => {
  const inc = doc.income_data;
  if (!inc) return null;
  return (
    <div key={idx} className="finance-card bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-800/60 rounded-3xl p-8 shadow-2xl">
      <div className="flex gap-6 items-start">
         <div className="p-5 bg-zinc-900/90 rounded-2xl border border-zinc-800">
            <Briefcase className="w-8 h-8 text-emerald-500" />
         </div>
         <div className="flex flex-col flex-1">
            <div className="flex justify-between items-start">
               <div>
                 <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{inc.nome_fonte_pagadora || 'Fonte Desconhecida'}</h3>
                 <p className="text-zinc-500 font-mono mt-1 tracking-widest text-sm">CNPJ: {inc.cnpj_fonte_pagadora || 'N/A'}</p>
               </div>
               <span className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-full text-xs font-bold font-sans tracking-widest border border-emerald-500/20">IRRF DE FONTES</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
               <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/40">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Rendimentos Brutos</p>
                  <p className="text-2xl font-black text-zinc-100">{formatCurrency(inc.rendimentos_tributaveis || 0)}</p>
               </div>
               <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/40">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Previdência (INSS)</p>
                  <p className="text-2xl font-black text-rose-400">{formatCurrency(inc.previdencia_oficial || 0)}</p>
               </div>
               <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/40">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Imposto Retido</p>
                  <p className="text-2xl font-black text-rose-500">{formatCurrency(inc.imposto_retido || 0)}</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

const renderAssetPurchase = (doc: PolymorphicDocument, idx: number) => {
  const ast = doc.asset_data;
  if (!ast) return null;
  return (
    <div key={idx} className="finance-card bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-800/60 rounded-3xl p-8 shadow-2xl">
      <div className="flex gap-6 items-start">
         <div className="p-5 bg-zinc-900/90 rounded-2xl border border-zinc-800">
            <Car className="w-8 h-8 text-blue-500" />
         </div>
         <div className="flex flex-col flex-1">
            <div className="flex justify-between items-start">
               <div>
                 <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{ast.descricao_bem || 'Bem Identificado'}</h3>
                 <p className="text-zinc-500 font-mono mt-1 tracking-widest text-sm">Vendedor/Outra Parte: {ast.cpf_cnpj_vendedor || 'N/A'}</p>
                 {ast.placa_registro && <p className="text-zinc-400 font-mono mt-1 tracking-widest text-xs">Licenciamento P.L: {ast.placa_registro}</p>}
               </div>
               <span className="bg-blue-500/10 text-blue-500 px-4 py-2 rounded-full text-xs font-bold font-sans tracking-widest border border-blue-500/20">CÓDIGO RFB {ast.codigo_rfb || '??'}</span>
            </div>
            
            <div className="flex items-center mt-8 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/40">
               <div>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Valor de Aquisição Localizado</p>
                  <p className="text-3xl font-black text-zinc-100">{formatCurrency(ast.valor_aquisicao || 0)}</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

const renderB3Note = (doc: PolymorphicDocument, idx: number) => {
  const b3 = doc.b3_data;
  const analysis = doc.b3_math_analysis;
  if (!b3) return null;
  
  return (
    <div key={idx} className="finance-card bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-800/60 rounded-3xl p-8 shadow-2xl">
      <div className="flex gap-6 items-start">
         <div className="p-5 bg-zinc-900/90 rounded-2xl border border-zinc-800">
            <Landmark className="w-8 h-8 text-indigo-500" />
         </div>
         <div className="flex flex-col flex-1">
            <div className="flex justify-between items-start">
               <div>
                 <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{b3.corretora || 'Corretora B3'}</h3>
                 <p className="text-zinc-500 font-sans mt-1 tracking-widest text-sm uppercase">Pregão Data: {b3.data || 'N/A'}</p>
               </div>
               <span className="bg-indigo-500/10 text-indigo-500 px-4 py-2 rounded-full text-xs font-bold font-sans tracking-widest border border-indigo-500/20">RENDA VARIÁVEL</span>
            </div>

            {analysis && (
              <div className="mt-8 space-y-6">
                {/* Day Trades */}
                {analysis.dayTradesIdentificados && analysis.dayTradesIdentificados.length > 0 && (
                  <div>
                    <p className="text-rose-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                       <AlertTriangle className="w-4 h-4" /> Operações Day Trade (Curto Prazo - Base 20%)
                    </p>
                    <div className="space-y-3">
                      {analysis.dayTradesIdentificados.map((t, i) => (
                         <div key={i} className="flex justify-between items-center bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/60">
                           <div className="flex items-center gap-4">
                             <div className={`p-3 rounded-xl shadow-inner ${t.tipoOperacao === 'C' ? 'bg-zinc-900 border border-zinc-800 text-zinc-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'}`}>
                                {t.tipoOperacao === 'C' ? <ArrowDownRight className="w-5 h-5"/> : <ArrowUpRight className="w-5 h-5"/>}
                             </div>
                             <div>
                               <p className="text-white font-black tracking-tighter text-xl leading-none">{t.ticker}</p>
                               <p className="text-zinc-600 text-[10px] font-bold tracking-widest mt-1 uppercase">{t.tipoOperacao === 'C' ? 'Compra' : 'Venda'}</p>
                             </div>
                           </div>
                           <div className="text-right">
                             <p className="text-zinc-300 font-bold tracking-tighter text-lg leading-none">{formatCurrency((t.precoUnitario * t.quantidade))}</p>
                             <p className="text-zinc-600 text-xs mt-2 font-mono">{t.quantidade} cotas de {formatCurrency(t.precoUnitario)}</p>
                           </div>
                         </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Swing Trades */}
                {analysis.swingTradesRemanescentes && analysis.swingTradesRemanescentes.length > 0 && (
                  <div className="pt-4 border-t border-zinc-800/50">
                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-3">Custódia Swing Trade</p>
                    <div className="space-y-3">
                      {analysis.swingTradesRemanescentes.map((t, i) => (
                         <div key={i} className="flex justify-between items-center bg-zinc-950/30 p-4 rounded-xl border border-zinc-800/30">
                           <div className="flex items-center gap-4">
                             <div className={`p-2 rounded-lg ${t.tipoOperacao === 'C' ? 'bg-zinc-900/50 text-zinc-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {t.tipoOperacao === 'C' ? <ArrowDownRight className="w-4 h-4"/> : <ArrowUpRight className="w-4 h-4"/>}
                             </div>
                             <div>
                               <p className="text-zinc-300 font-black tracking-tighter text-lg leading-none">{t.ticker}</p>
                               <p className="text-zinc-600 text-[10px] font-bold tracking-widest mt-1 uppercase">{t.tipoOperacao === 'C' ? 'Compra' : 'Venda'}</p>
                             </div>
                           </div>
                           <div className="text-right">
                             <p className="text-zinc-400 font-bold tracking-tighter">{formatCurrency((t.precoUnitario * t.quantidade))}</p>
                             <p className="text-zinc-600 text-[11px] mt-1 font-mono">{t.quantidade} cotas de {formatCurrency(t.precoUnitario)}</p>
                           </div>
                         </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
         </div>
      </div>
    </div>
  );
}

const renderUnknown = (doc: PolymorphicDocument, idx: number) => {
  return (
    <div key={idx} className="finance-card bg-amber-500/5 backdrop-blur-2xl border border-amber-500/20 rounded-3xl p-8 shadow-2xl">
      <div className="flex gap-6 items-center">
         <div className="p-5 bg-amber-500/10 rounded-2xl border border-amber-500/30">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
         </div>
         <div>
            <h3 className="text-xl font-black text-amber-500 tracking-tighter uppercase">Documento Misto / Suspeito</h3>
            <p className="text-zinc-400 mt-2 text-sm leading-relaxed max-w-2xl">
              Tentamos mapear a estrutura fiscal deste documento com o Smart Router (Zod), contudo ele não segue os padrões estritos das notas de Bolsa, Base Extrato de RH ou Veículos/Imóveis. A malha retentora alocou em Categoria Desconhecida para interpretação humana.
            </p>
         </div>
      </div>
    </div>
  );
}

export default function FinancialWhiteboard({ data }: FinancialWhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (data.length > 0) {
      const cards = gsap.utils.toArray('.finance-card');
      const lastCard = cards[cards.length - 1] as HTMLElement;
      
      gsap.fromTo(lastCard, 
        { y: 30, opacity: 0, scale: 0.95 }, 
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, { dependencies: [data], scope: containerRef });

  if (data.length === 0) return null;

  return (
    <div ref={containerRef} className="w-full flex-1 overflow-y-auto px-8 md:px-12 py-6 custom-scrollbar space-y-6">
      <div className="flex items-center justify-between mb-10 sticky top-6 bg-[#0c0c0e]/80 backdrop-blur-2xl px-8 py-5 rounded-3xl z-10 border border-zinc-800/80 shadow-2xl">
        <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.3em] font-sans">Supervisão Fiscal Conectada</h2>
        <span className="bg-zinc-950 text-emerald-500 px-5 py-2 flex items-center gap-2 rounded-full text-xs font-bold font-sans tracking-widest shadow-inner border border-zinc-800/60">
          <BadgeAlert className="w-4 h-4" />
          {data.length} DOCUMENTO(S) COMPILADOS
        </span>
      </div>

      <div className="space-y-6 pb-20">
        {data.map((doc, idx) => {
          switch (doc.documentType) {
            case 'INCOME_STATEMENT': return renderIncomeStatement(doc, idx);
            case 'ASSET_PURCHASE': return renderAssetPurchase(doc, idx);
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
