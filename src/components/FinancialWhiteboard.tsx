'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Landmark, BadgeAlert, FileArchive, ReceiptText } from 'lucide-react';
import { UniversalDocument } from '../types/finance';

interface FinancialWhiteboardProps {
  data: UniversalDocument[];
}

export default function FinancialWhiteboard({ data }: FinancialWhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Animate cards on entry
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
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-white/90 backdrop-blur-md pt-4 pb-4 z-10 border-b border-zinc-100">
        <h2 className="text-sm font-black text-zinc-400 uppercase tracking-[0.2em] font-sans">Contexto Acumulado</h2>
        <span className="bg-zinc-100 text-zinc-600 px-4 py-1.5 flex items-center gap-2 rounded-full text-xs font-bold font-sans tracking-wide">
          <BadgeAlert className="w-4 h-4 text-zinc-500" />
          {data.length} Documento(s)
        </span>
      </div>

      <div className="space-y-6 pb-20">
        {data.map((doc, idx) => {
          if (doc.categoria === 'DECLARACAO_ANTERIOR') {
            const ano = doc.dados_declaracao_anterior?.ano_exercicio || 'Desconhecido';
            const bens = doc.dados_declaracao_anterior?.total_bens_direitos || 0;
            const dependentes = doc.dados_declaracao_anterior?.dependentes_identificados || 0;

            return (
              <div key={idx} className="finance-card bg-zinc-100 border border-zinc-300 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="p-4 bg-zinc-200/50 rounded-2xl border border-zinc-300/60 shadow-inner">
                      <FileArchive className="w-6 h-6 text-zinc-700" />
                    </div>
                    <div>
                      <h3 className="font-black text-zinc-950 text-xl tracking-tight leading-none mb-1">Base de {ano} Importada</h3>
                      <p className="text-zinc-600 text-sm font-medium tracking-wide">
                        {dependentes} dependentes mapeados, {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bens)} em bens
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-200 text-zinc-700 px-4 py-2 rounded-full text-xs font-bold tracking-wide shadow-sm">
                    Declaração Anterior
                  </div>
                </div>
              </div>
            );
          }

          if (doc.categoria === 'B3') {
            return (
              <div key={idx} className="finance-card bg-white border border-zinc-200 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                {/* Header da Nota */}
                <div className="flex justify-between items-start mb-8">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/60 shadow-inner">
                      <Landmark className="w-6 h-6 text-zinc-700" />
                    </div>
                    <div>
                      <h3 className="font-black text-zinc-950 text-xl tracking-tight leading-none mb-1">{doc.corretora || 'Corretora Não Identificada'}</h3>
                      <p className="text-zinc-500 text-sm font-medium tracking-wide">Pregão B3: {doc.data_pregao || 'Data Ausente'}</p>
                    </div>
                  </div>
                  
                  {doc.eventos_pendentes && (
                    <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-full text-xs font-bold tracking-wide shadow-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Eventos Societários
                    </div>
                  )}
                </div>

                {/* Operações Listadas */}
                <div className="space-y-3">
                  {doc.operacoes?.map((op, opIdx) => {
                    const isCompra = op.tipo === 'COMPRA';
                    return (
                      <div key={opIdx} className="group flex items-center justify-between p-5 rounded-2xl bg-zinc-50/50 border border-zinc-100 hover:bg-zinc-100/50 hover:border-zinc-200 transition-colors">
                        <div className="flex items-center gap-5">
                          <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${isCompra ? 'bg-zinc-200/60 text-zinc-700' : 'bg-zinc-950 text-white'}`}>
                            {isCompra ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-zinc-950 text-lg tracking-tight leading-none block">{op.ticker}</span>
                            <span className="text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">
                              {op.classificacao.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right flex flex-col items-end">
                          <p className="font-black text-zinc-950 text-lg leading-none mb-1 tracking-tight">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(op.valor_total_rateado)}
                          </p>
                          <p className="text-xs font-bold text-zinc-500 tracking-wide">
                            {op.quantidade} cotas a {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(op.preco_unitario)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            );
          }

          // Fallback para outros documentos genéricos (SAUDE, EDUCACAO, etc)
          const valor = doc.valor_total || 0;
          return (
            <div key={idx} className="finance-card bg-white border border-zinc-200 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
              <div className="flex justify-between items-start">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/60 shadow-inner">
                    <ReceiptText className="w-6 h-6 text-zinc-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-zinc-950 text-xl tracking-tight leading-none mb-1">{doc.emissor || 'Emissor Não Identificado'}</h3>
                    <p className="text-zinc-500 text-sm font-medium tracking-wide">Data: {doc.data_emissao || 'N/A'}</p>
                    <p className="text-zinc-600 text-sm mt-2">{doc.descricao_generica}</p>
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end">
                  <p className="font-black text-zinc-950 text-xl leading-none mb-1 tracking-tight">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}
                  </p>
                  <p className="flex items-center gap-2 bg-zinc-100 text-zinc-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide mt-2">
                    {doc.categoria}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
