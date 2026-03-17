'use client';

import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Message = { role: 'user' | 'assistant'; content: string; isNew?: boolean };

export default function Home() {
  const container = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Estados
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [isWorkspaceActive, setIsWorkspaceActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  
  // Estados do Chat
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Animação de entrada inicial
  useGSAP(() => {
    if (!isWorkspaceActive) {
      gsap.from('.anim-up', {
        y: 40, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out'
      });
    } else {
      gsap.from('.chat-anim', {
        y: 20, opacity: 0, duration: 0.5, ease: 'power2.out'
      });
    }
  }, { scope: container, dependencies: [isWorkspaceActive] });

  // Auto-scroll do chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleBaseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setBaseFile(e.target.files[0]);
  };

  const handleReceiptsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setReceiptFiles(Array.from(e.target.files));
  };

  // O Gatilho de Transição (Extração -> GSAP -> Chat)
  const startAnalysis = async () => {
    if (!baseFile && receiptFiles.length === 0) return;
    setLoading(true);

    const formData = new FormData();
    if (baseFile) formData.append('baseDocument', baseFile);
    receiptFiles.forEach((file) => formData.append('receipts', file));

    try {
      const response = await fetch('/api/extract', { method: 'POST', body: formData });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      setExtractedData(data);

      // Prepara a primeira mensagem da IA com base nos dados
      let welcomeMessage = 'Análise concluída! Cruzei os seus documentos com as regras da Receita Federal.\n\n';
      if (data.plano_acao && data.plano_acao.length > 0) {
        welcomeMessage += `Identifiquei **${data.plano_acao.length} ações pendentes** para maximizar a sua restituição.\n\nQual é a sua dúvida para começarmos o preenchimento?`;
      } else {
        welcomeMessage += 'Não identifiquei nenhuma pendência grave. A sua declaração base parece estruturalmente correta. Como o posso ajudar hoje?';
      }

      setChatMessages([{ role: 'assistant', content: welcomeMessage, isNew: true }]);

      // Animação de saída da Landing Page e entrada no Chat
      gsap.to('.landing-content', {
        opacity: 0, y: -50, duration: 0.5, ease: 'power2.in',
        onComplete: () => {
          setIsWorkspaceActive(true);
          setLoading(false);
        }
      });
    } catch (error) {
      alert("Falha na auditoria dos documentos. Tente novamente.");
      setLoading(false);
    }
  };

  // Envio de mensagens no Chat
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, contextData: extractedData })
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Erro.", isNew: true }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Falha de conexão.", isNew: true }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <main ref={container} className="h-screen bg-white dark:bg-zinc-950 text-neutral-900 dark:text-white font-sans overflow-hidden flex flex-col">
      
      {/* HEADER FIXO - Simplificado e Responsivo */}
      <header className="flex-shrink-0 w-full p-4 md:p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">I</div>
          <span className="font-extrabold tracking-tighter text-lg md:text-xl">IRPF Copilot</span>
        </div>
      </header>

      {!isWorkspaceActive ? (
        /* ESTADO 1: LANDING PAGE & UPLOAD (Com Scroll Próprio) */
        <div className="flex-1 overflow-y-auto">
          <div className="landing-content flex flex-col items-center min-h-full py-10 px-4 sm:px-6">
            
            <div className="anim-up bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border border-blue-100 dark:border-blue-800/30">
              Inteligência Fiscal 2026
            </div>
            
            <h1 className="anim-up text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-center max-w-4xl mb-6 leading-tight">
              A sua declaração de IRPF, <br/><span className="text-blue-600">sem medo da malha fina.</span>
            </h1>
            
            <p className="anim-up text-base sm:text-lg md:text-xl text-neutral-500 max-w-2xl text-center mb-12 px-4">
              Arraste os seus documentos, recibos médicos ou PDFs oficiais. A nossa inteligência cruza os dados com a lei e faz o trabalho pesado.
            </p>

            <div className="anim-up flex flex-col md:flex-row gap-4 w-full max-w-3xl mb-8">
              {/* Card 1: Declaração Base */}
              <label htmlFor="base-upload" className={`flex-1 border-2 border-dashed rounded-3xl p-6 sm:p-10 flex flex-col items-center cursor-pointer transition-colors text-center ${baseFile ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-neutral-300 dark:border-zinc-700 hover:border-blue-400'}`}>
                <input type="file" id="base-upload" className="hidden" onChange={handleBaseFileChange} accept="application/pdf,application/json" />
                <div className={`p-4 rounded-full mb-4 ${baseFile ? 'bg-blue-100 text-blue-600' : 'bg-neutral-100 dark:bg-zinc-800 text-neutral-500'}`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <span className="font-semibold text-neutral-800 dark:text-zinc-200">{baseFile ? 'Declaração Anexada' : 'Declaração de 2025 (PDF)'}</span>
                {baseFile && <span className="text-xs text-blue-600 mt-2 truncate w-full px-4">{baseFile.name}</span>}
              </label>

              {/* Card 2: Recibos */}
              <label htmlFor="receipts-upload" className={`flex-1 border-2 border-dashed rounded-3xl p-6 sm:p-10 flex flex-col items-center cursor-pointer transition-colors text-center ${receiptFiles.length > 0 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-neutral-300 dark:border-zinc-700 hover:border-blue-400'}`}>
                <input type="file" id="receipts-upload" className="hidden" onChange={handleReceiptsChange} accept="image/*,application/pdf" multiple />
                <div className={`p-4 rounded-full mb-4 ${receiptFiles.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-neutral-100 dark:bg-zinc-800 text-neutral-500'}`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </div>
                <span className="font-semibold text-neutral-800 dark:text-zinc-200">{receiptFiles.length > 0 ? `${receiptFiles.length} Ficheiro(s)` : 'Novos Recibos e Informes'}</span>
              </label>
            </div>

            <button 
              onClick={startAnalysis} 
              disabled={(!baseFile && receiptFiles.length === 0) || loading}
              className="anim-up bg-blue-600 text-white px-8 py-4 sm:py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-transform hover:scale-[1.02] active:scale-[0.98] w-full max-w-md shadow-xl disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? (
                <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> A analisar com IA...</>
              ) : 'Analisar e Iniciar Consultoria'}
            </button>
            
            <div className="anim-up flex items-center gap-2 mt-6 text-neutral-400 dark:text-zinc-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <span className="text-[10px] sm:text-xs font-medium tracking-wide uppercase">Zero Data Retention • LGPD Compliance</span>
            </div>
          </div>
        </div>
      ) : (
        /* ESTADO 2: O CHAT PURO E CENTRALIZADO (Mobile First) */
        <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto overflow-hidden chat-anim bg-white dark:bg-zinc-950 md:border-x md:border-neutral-100 md:dark:border-zinc-900 md:shadow-2xl">
          
          {/* Feed de Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 custom-scrollbar">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center shadow-sm mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                )}
                <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-3xl text-sm md:text-base leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-neutral-900 text-white dark:bg-zinc-200 dark:text-zinc-900 rounded-tr-sm' : 'bg-neutral-50 border border-neutral-200 dark:bg-zinc-900 dark:border-zinc-800 text-neutral-800 dark:text-neutral-200 rounded-tl-sm'}`}>
                  {/* Processamento simples de quebras de linha e negrito */}
                  <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
              </div>
            ))}
            
            {isChatLoading && (
              <div className="flex justify-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center shadow-sm mt-1">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 dark:bg-zinc-900 p-4 rounded-3xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} className="h-4" />
          </div>

          {/* Área de Input Fixada na Base */}
          <div className="flex-shrink-0 p-4 bg-white dark:bg-zinc-950 border-t border-neutral-100 dark:border-zinc-900">
            <div className="bg-neutral-100 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl flex items-center gap-2 p-1.5 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Pergunte à IA como proceder..."
                className="flex-1 bg-transparent border-none px-4 py-3 outline-none text-neutral-800 dark:text-white text-base"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isChatLoading}
                className="bg-blue-600 text-white p-3 rounded-full disabled:opacity-50 hover:bg-blue-700 transition-transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
          
        </div>
      )}
    </main>
  );
}