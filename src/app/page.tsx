'use client';

import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

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

  // Animação de entrada épica da Landing Page
  useGSAP(() => {
    gsap.from('.anim-up', {
      y: 60, opacity: 0, stagger: 0.1, duration: 1.2, ease: 'power4.out', delay: 0.2
    });
  }, { scope: container });

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

      let welcomeMessage = 'Análise concluída! Cruzei os seus documentos com as regras da Receita Federal.\n\n';
      if (data.plano_acao && data.plano_acao.length > 0) {
        welcomeMessage += `Identifiquei **${data.plano_acao.length} ações pendentes** para maximizar a sua restituição.\n\nQual é a sua dúvida para começarmos o preenchimento?`;
      } else {
        welcomeMessage += 'Não identifiquei nenhuma pendência grave. A sua declaração base parece estruturalmente correta. Como o posso ajudar hoje?';
      }

      setChatMessages([{ role: 'assistant', content: welcomeMessage, isNew: true }]);
      setIsWorkspaceActive(true); // O Tailwind assume a transição visual a partir daqui

    } catch (error) {
      alert("Falha na auditoria dos documentos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

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
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha na API: ${errorText.substring(0, 50)}...`);
      }

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Erro vazio.", isNew: true }]);
      
    } catch (error: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `🚨 Erro Crítico: ${error.message}`, isNew: true }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <main ref={container} className="relative min-h-screen bg-white dark:bg-[#09090b] text-neutral-900 dark:text-white font-sans selection:bg-blue-500/30">
      
      {/* =========================================
          ESTADO 1: LANDING PAGE (VIBE GTA VI)
      ========================================= */}
      <div className={`w-full flex flex-col items-center justify-start pt-24 pb-32 px-4 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${isWorkspaceActive ? 'opacity-0 blur-md scale-95 pointer-events-none' : 'opacity-100 blur-0 scale-100'}`}>
        
        {/* Badge Hero */}
        <div className="anim-up bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-12 border border-blue-100 dark:border-blue-800/30 shadow-sm">
          Inteligência Fiscal 2026
        </div>
        
        {/* Tipografia Massiva */}
        <h1 className="anim-up text-6xl sm:text-8xl md:text-[8rem] font-black tracking-tighter text-center max-w-6xl mb-8 leading-[0.85] text-neutral-900 dark:text-white">
          AUDITORIA <br/><span className="text-blue-600 dark:text-blue-500">AUTÓNOMA.</span>
        </h1>
        
        <p className="anim-up text-lg md:text-2xl text-neutral-500 dark:text-zinc-400 font-medium max-w-3xl text-center mb-16 tracking-tight">
          Nenhuma interface confusa. Apenas anexe a sua vida financeira e deixe a IA auditar o seu imposto contra a malha fina usando a doutrina oficial da Receita.
        </p>

        {/* O "Terminal" de Upload */}
        <div className="anim-up w-full max-w-4xl bg-neutral-50 dark:bg-zinc-900/60 border border-neutral-200 dark:border-zinc-800/80 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row gap-6 w-full mb-8">
            
            {/* Botão: Declaração Base */}
            <label htmlFor="base-upload" className={`flex-1 border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${baseFile ? 'border-blue-500 bg-blue-500/10' : 'border-neutral-300 dark:border-zinc-700 hover:border-blue-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <input type="file" id="base-upload" className="hidden" onChange={handleBaseFileChange} accept="application/pdf,application/json" />
              <svg className={`w-12 h-12 mb-4 ${baseFile ? 'text-blue-500' : 'text-neutral-400 dark:text-zinc-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="font-bold text-lg text-neutral-800 dark:text-zinc-100">{baseFile ? 'Declaração Anexada' : 'Declaração 2025 (PDF)'}</span>
              {baseFile && <span className="text-sm text-blue-500 mt-2 truncate max-w-[200px]">{baseFile.name}</span>}
            </label>

            {/* Botão: Recibos */}
            <label htmlFor="receipts-upload" className={`flex-1 border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${receiptFiles.length > 0 ? 'border-blue-500 bg-blue-500/10' : 'border-neutral-300 dark:border-zinc-700 hover:border-blue-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <input type="file" id="receipts-upload" className="hidden" onChange={handleReceiptsChange} accept="image/*,application/pdf" multiple />
              <svg className={`w-12 h-12 mb-4 ${receiptFiles.length > 0 ? 'text-blue-500' : 'text-neutral-400 dark:text-zinc-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="font-bold text-lg text-neutral-800 dark:text-zinc-100">{receiptFiles.length > 0 ? `${receiptFiles.length} Ficheiro(s)` : 'Novos Recibos'}</span>
              <span className="text-sm text-neutral-500 mt-2">Médicos, Offshores, Informes</span>
            </label>
            
          </div>

          <button onClick={startAnalysis} disabled={(!baseFile && receiptFiles.length === 0) || loading} className="w-full bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-xl tracking-wide hover:bg-blue-700 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex justify-center items-center gap-3 shadow-xl shadow-blue-900/20">
            {loading ? (
              <><svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> A PROCESSAR DADOS...</>
            ) : 'INICIAR AUDITORIA'}
          </button>
        </div>

        {/* Discovery Section (Scrollável) */}
        <div className="anim-up mt-32 grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl w-full px-6 text-left border-t border-neutral-200 dark:border-zinc-800 pt-20">
          <div>
            <div className="w-12 h-12 bg-neutral-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-6 text-2xl">🛡️</div>
            <h3 className="text-xl font-bold mb-3 dark:text-white">Privacidade Absoluta.</h3>
            <p className="text-neutral-500 dark:text-zinc-400 leading-relaxed">Arquitetura Zero Data Retention. Os seus PDFs são processados em memória volátil e destruídos após a extração. LGPD Compliance total.</p>
          </div>
          <div>
            <div className="w-12 h-12 bg-neutral-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-6 text-2xl">⚖️</div>
            <h3 className="text-xl font-bold mb-3 dark:text-white">Baseado na Lei.</h3>
            <p className="text-neutral-500 dark:text-zinc-400 leading-relaxed">Não adivinhamos. O motor de IA utiliza RAG para ler as 411 páginas do Manual Oficial da Receita Federal antes de responder a qualquer pergunta.</p>
          </div>
          <div>
            <div className="w-12 h-12 bg-neutral-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-6 text-2xl">⚡</div>
            <h3 className="text-xl font-bold mb-3 dark:text-white">Velocidade Extrema.</h3>
            <p className="text-neutral-500 dark:text-zinc-400 leading-relaxed">Alimentado por Llama 3 70B rodando em chips LPU Groq. Respostas complexas de planeamento tributário geradas a mais de 800 tokens por segundo.</p>
          </div>
        </div>
      </div>

      {/* =========================================
          ESTADO 2: WORKSPACE (TAKEOVER APPLE-STYLE)
      ========================================= */}
      <div className={`fixed inset-0 z-50 flex justify-center items-center bg-neutral-100/90 dark:bg-[#09090b]/95 backdrop-blur-xl transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${isWorkspaceActive ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-32 scale-95 pointer-events-none'}`}>
        
        {/* Container do Chat */}
        <div className="flex-1 flex flex-col w-full max-w-5xl h-[95vh] rounded-[2rem] overflow-hidden bg-white dark:bg-zinc-950/80 border border-neutral-200 dark:border-zinc-800/80 shadow-2xl mx-4">
          
          {/* Header do Chat */}
          <div className="flex-shrink-0 p-6 flex justify-between items-center border-b border-neutral-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">I</div>
              <span className="font-extrabold tracking-tight text-xl text-neutral-900 dark:text-white">IRPF Copilot</span>
            </div>
            <button onClick={() => setIsWorkspaceActive(false)} className="px-4 py-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
              Fechar Sessão
            </button>
          </div>

          {/* Feed de Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 md:px-10 py-8 space-y-8 custom-scrollbar">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex-shrink-0 flex items-center justify-center shadow-lg shadow-blue-600/20 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                )}
                <div className={`max-w-[85%] md:max-w-[75%] p-5 rounded-3xl text-[15px] md:text-base leading-relaxed ${msg.role === 'user' ? 'bg-neutral-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-sm shadow-md' : 'bg-neutral-50 border border-neutral-200 dark:bg-zinc-900/50 dark:border-zinc-800 text-neutral-800 dark:text-neutral-200 rounded-tl-sm'}`}>
                  <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
              </div>
            ))}
            
            {isChatLoading && (
              <div className="flex justify-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex-shrink-0 flex items-center justify-center shadow-lg shadow-blue-600/20 mt-1">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 dark:bg-zinc-900/50 dark:border-zinc-800 p-5 rounded-3xl rounded-tl-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></span>
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} className="h-4" />
          </div>

          {/* Input do Chat */}
          <div className="flex-shrink-0 p-4 md:p-6 bg-white dark:bg-zinc-950/80 border-t border-neutral-100 dark:border-zinc-800/80">
            <div className="bg-neutral-100 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-full flex items-center gap-2 p-2 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all shadow-inner">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Pergunte à IA como proceder..."
                className="flex-1 bg-transparent border-none px-6 py-3 outline-none text-neutral-800 dark:text-white text-base font-medium placeholder:text-neutral-400"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isChatLoading}
                className="bg-blue-600 text-white p-4 rounded-full disabled:opacity-50 hover:bg-blue-700 transition-transform hover:scale-105 shadow-md shadow-blue-600/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
          
        </div>
      </div>
      
    </main>
  );
}