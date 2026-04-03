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
      <div className="flex items-center justify-between mb-10 sticky top-6 bg-[#121214]/70 backdrop-blur-2xl px-8 py-5 rounded-3xl z-10 border border-zinc-800/80 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.3em] font-sans">Contexto Acumulado</h2>
        <span className="bg-zinc-900/80 text-zinc-300 px-5 py-2 flex items-center gap-2 rounded-full text-xs font-bold font-sans tracking-widest shadow-inner border border-zinc-800/60">
          <BadgeAlert className="w-4 h-4 text-emerald-500" />
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
              <div key={idx} className="finance-card bg-[#121214]/60 backdrop-blur-xl border border-zinc-800/60 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] hover:border-zinc-700/80 transition-all duration-500">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col md:flex-row md:items-center gap-5">
                    <div className="p-5 bg-zinc-900/80 rounded-3xl border border-zinc-800/60 shadow-inner">
                      <FileArchive className="w-7 h-7 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-black text-zinc-100 text-2xl tracking-tighter leading-none mb-2">Base de {ano} Importada</h3>
                      <p className="text-zinc-500 text-sm font-medium tracking-wide">
                        {dependentes} dependentes mapeados, <span className="text-zinc-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bens)}</span> em bens
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="bg-zinc-900/80 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-full text-xs font-bold tracking-widest shadow-sm uppercase">
                      Declaração Anterior
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (doc.categoria === 'B3') {
            return (
              <div key={idx} className="finance-card bg-[#121214]/60 backdrop-blur-xl border border-zinc-800/60 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] hover:border-zinc-700/80 transition-all duration-500">
                {/* Header da Nota */}
                <div className="flex justify-between items-start mb-10">
                  <div className="flex flex-col md:flex-row md:items-center gap-5">
                    <div className="p-5 bg-zinc-900/80 rounded-3xl border border-zinc-800/60 shadow-inner">
                      <Landmark className="w-7 h-7 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-black text-zinc-100 text-2xl tracking-tighter leading-none mb-2">{doc.corretora || 'Corretora Não Identificada'}</h3>
                      <p className="text-zinc-500 text-sm font-medium tracking-wide">Pregão B3: <span className="text-zinc-300">{doc.data_pregao || 'Data Ausente'}</span></p>
                    </div>
                  </div>
                  
                  {doc.eventos_pendentes && (
                    <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-4 py-2 rounded-full text-xs font-bold tracking-widest shadow-sm uppercase">
                      <AlertTriangle className="w-4 h-4" />
                      Eventos Societários
                    </div>
                  )}
                </div>

                {/* Operações Listadas */}
                <div className="space-y-4">
                  {doc.operacoes?.map((op, opIdx) => {
                    const isCompra = op.tipo === 'COMPRA';
                    return (
                      <div key={opIdx} className="group flex items-center justify-between p-6 rounded-3xl bg-[#0c0c0e]/50 border border-zinc-800/50 hover:bg-[#151518] hover:border-zinc-700/60 transition-all duration-300">
                        <div className="flex items-center gap-6">
                          <div className={`p-4 rounded-2xl transition-transform duration-500 group-hover:scale-110 shadow-inner ${isCompra ? 'bg-zinc-900 border border-zinc-800 text-zinc-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'}`}>
                            {isCompra ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-zinc-100 text-xl tracking-tighter leading-none mb-1 block">{op.ticker}</span>
                            <span className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">
                              {op.classificacao.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right flex flex-col items-end">
                          <p className="font-black text-zinc-100 text-xl leading-none mb-2 tracking-tighter">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(op.valor_total_rateado)}
                          </p>
                          <p className="text-xs font-bold text-zinc-500 tracking-wide">
                            {op.quantidade} cotas a <span className="text-zinc-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(op.preco_unitario)}</span>
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
            <div key={idx} className="finance-card bg-[#121214]/60 backdrop-blur-xl border border-zinc-800/60 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] hover:border-zinc-700/80 transition-all duration-500">
              <div className="flex justify-between items-start">
                <div className="flex flex-col md:flex-row md:items-center gap-5">
                  <div className="p-5 bg-zinc-900/80 rounded-3xl border border-zinc-800/60 shadow-inner">
                    <ReceiptText className="w-7 h-7 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-zinc-100 text-2xl tracking-tighter leading-none mb-2">{doc.emissor || 'Emissor Não Identificado'}</h3>
                    <p className="text-zinc-500 text-sm font-medium tracking-wide">Data: <span className="text-zinc-300">{doc.data_emissao || 'N/A'}</span></p>
                    <p className="text-zinc-400 text-sm mt-3 leading-relaxed">{doc.descricao_generica}</p>
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end">
                  <p className="font-black text-zinc-100 text-2xl leading-none mb-3 tracking-tighter">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}
                  </p>
                  <p className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-full text-xs font-bold tracking-widest shadow-sm uppercase">
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
