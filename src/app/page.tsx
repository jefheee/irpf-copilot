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

      // BLINDAGEM ADICIONADA: Força a captura se a API devolver erro (500, 404, etc)
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha na API: ${errorText.substring(0, 50)}...`);
      }

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Erro vazio.", isNew: true }]);
      
    } catch (error: any) {
      // Agora o erro destrava o ecrã e é exibido diretamente no balão de chat
      setChatMessages(prev => [...prev, { role: 'assistant', content: `🚨 Erro Crítico: ${error.message}`, isNew: true }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <main ref={container} className="h-screen bg-white dark:bg-zinc-950 text-neutral-900 dark:text-white font-sans overflow-hidden flex flex-col relative">
      
      {/* HEADER FIXO SOBREPOSTO */}
      <header className="flex-shrink-0 w-full p-4 md:p-6 flex justify-between items-center z-50 absolute top-0 left-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">I</div>
          <span className="font-extrabold tracking-tighter text-lg md:text-xl">IRPF Copilot</span>
        </div>
      </header>

      {/* CONTENTOR CENTRAL - CSS GRID PARA CROSSFADE */}
      <div className="flex-1 w-full grid grid-cols-1 grid-rows-1 mt-20">
        
        {/* ESTADO 1: LANDING PAGE */}
        <div className={`landing-content col-start-1 row-start-1 w-full h-full overflow-y-auto transition-all duration-700 ease-in-out ${isWorkspaceActive ? 'opacity-0 pointer-events-none scale-95 translate-y-[-20px]' : 'opacity-100 z-10 translate-y-0'}`}>
          <div className="flex flex-col items-center min-h-full py-10 px-4 sm:px-6">
            
            <div className="anim-up bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border border-blue-100 dark:border-blue-800/30">
              Inteligência Fiscal 2026
            </div>
            
            <h1 className="anim-up text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-center max-w-4xl mb-6 leading-tight">
              A sua declaração de IRPF, <br/><span className="text-blue-600">sem medo da malha fina.</span>
            </h1>
            
            {/* INCLUA AQUI OS SEUS BOTÕES E INPUTS DE UPLOAD ORIGINAIS */}
            <p className="anim-up text-base sm:text-lg md:text-xl text-neutral-500 max-w-2xl text-center mb-12 px-4">
              Arraste os seus documentos, recibos médicos ou PDFs oficiais. A nossa inteligência cruza os dados com a lei e faz o trabalho pesado.
            </p>

            <div className="anim-up flex flex-col md:flex-row gap-4 w-full max-w-3xl mb-8">
              {/* O seu Card 1 e Card 2 originais vão aqui */}
            </div>

            <button onClick={startAnalysis} disabled={loading} className="anim-up bg-blue-600 text-white px-8 py-4 sm:py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-transform hover:scale-[1.02] active:scale-[0.98] w-full max-w-md shadow-xl disabled:opacity-50 flex justify-center items-center gap-2">
              {loading ? 'A analisar com IA...' : 'Analisar e Iniciar Consultoria'}
            </button>

          </div>
        </div>

        {/* ESTADO 2: O CHAT PURO E CENTRALIZADO */}
        <div className={`chat-anim col-start-1 row-start-1 flex-1 flex flex-col w-full max-w-4xl mx-auto h-full overflow-hidden bg-white dark:bg-zinc-950 md:border-x md:border-neutral-100 md:dark:border-zinc-900 md:shadow-2xl transition-all duration-700 ease-out delay-100 ${!isWorkspaceActive ? 'opacity-0 pointer-events-none translate-y-10' : 'opacity-100 z-20 translate-y-0'}`}>
          
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
      </div>
    </main>
  );
}