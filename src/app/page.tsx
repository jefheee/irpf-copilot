'use client';

import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = { role: 'user' | 'assistant' | 'system'; content: string; isNew?: boolean };

export default function Home() {
  const container = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Estados Core
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [isWorkspaceActive, setIsWorkspaceActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  
  // Estados do Chat
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isUploadingMidChat, setIsUploadingMidChat] = useState(false);

  // Estados de UI (Menu e Tema)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Controle de Tema Dinâmico
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Animação da Landing Page
  useGSAP(() => {
    gsap.from('.anim-up', {
      y: 60, opacity: 0, stagger: 0.1, duration: 1.2, ease: 'power4.out', delay: 0.2
    });
  }, { scope: container });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
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

      let welcomeMessage = `### Auditoria Concluída 🚀\n\nAnalisei os seus documentos e consolidei os dados. Pode ver o **Plano de Ação** detalhado e a **Visão de Futuro** no painel lateral à sua direita.\n\n`;
      if (data.documentos_pendentes?.length > 0) {
        welcomeMessage += `Notei que faltam alguns comprovativos (listados no painel). Pode anexá-los a qualquer momento no clipe de papel abaixo.\n\n`;
      }
      welcomeMessage += `**Como o posso ajudar a começar o preenchimento?**`;

      setChatMessages([{ role: 'assistant', content: welcomeMessage, isNew: true }]);
      setIsWorkspaceActive(true);

    } catch (error) {
      alert("Falha na auditoria dos documentos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleMidChatUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setIsUploadingMidChat(true);

    const formData = new FormData();
    files.forEach((file) => formData.append('receipts', file));

    try {
      setChatMessages(prev => [...prev, { role: 'system', content: `⏳ A processar novos anexos (${files.length} ficheiro(s))...` }]);
      const response = await fetch('/api/extract', { method: 'POST', body: formData });
      const newData = await response.json();
      
      setExtractedData((prev: any) => ({
        ...prev,
        fichas: [...(prev?.fichas || []), ...(newData.fichas || [])],
        documentos_pendentes: newData.documentos_pendentes || prev?.documentos_pendentes,
      }));

      setChatMessages(prev => [
        ...prev.filter(msg => !msg.content.includes('processar novos anexos')),
        { role: 'assistant', content: `✅ **Anexos processados!** O painel lateral foi atualizado. Pode perguntar-me sobre os novos dados.` }
      ]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `🚨 Erro ao ler o novo anexo.` }]);
    } finally {
      setIsUploadingMidChat(false);
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
      if (!response.ok) throw new Error("Falha na API.");
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Erro vazio.", isNew: true }]);
    } catch (error: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `🚨 **Erro Crítico:** ${error.message}`, isNew: true }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <main ref={container} className={`relative min-h-screen transition-colors duration-500 bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-white font-sans selection:bg-blue-500/30 overflow-hidden`}>
      
      {/* ================= BOTÃO DO MENU (GTA VI STYLE) ================= */}
      <div className="absolute top-6 right-6 lg:top-10 lg:right-10 z-[60]">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-3 bg-white/10 dark:bg-black/20 backdrop-blur-md border border-neutral-200 dark:border-zinc-800 rounded-full hover:scale-110 transition-transform shadow-lg"
        >
          <svg className="w-6 h-6 text-neutral-800 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
        </button>
      </div>

      {/* ================= OVERLAY MENU ================= */}
      <div className={`fixed inset-0 z-[70] flex justify-end transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMenuOpen ? 'visible bg-black/40 backdrop-blur-sm' : 'invisible bg-black/0 backdrop-blur-none'}`}>
        <div className={`w-full max-w-sm sm:max-w-md h-full bg-white dark:bg-[#0c0c0e] border-l border-neutral-200 dark:border-zinc-800 shadow-2xl p-8 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          
          <div className="flex justify-between items-center mb-16">
            <span className="font-black tracking-widest uppercase text-xl text-neutral-900 dark:text-white">Opções</span>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Aparência</h3>
              <button onClick={toggleTheme} className="flex items-center gap-4 text-lg font-bold hover:text-blue-600 transition-colors">
                {theme === 'dark' ? (
                  <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> Modo Claro</>
                ) : (
                  <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> Modo Escuro</>
                )}
              </button>
            </div>

            <div className="w-full h-px bg-neutral-200 dark:bg-zinc-800"></div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Legal & Privacidade</h3>
              <nav className="flex flex-col gap-4 text-neutral-600 dark:text-zinc-300 font-medium">
                <a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Contato</a>
                <a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Política de Privacidade</a>
                <a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Preferências de Cookies</a>
                <a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Política de Cookies</a>
                <a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Avisos Legais</a>
                <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-bold">Solicitação de Dados (LGPD)</a>
              </nav>
            </div>
          </div>
          
          <div className="pt-8 mt-auto text-xs text-neutral-400 dark:text-zinc-600 font-medium">
            &copy; 2026 IRPF Copilot. Todos os direitos reservados.
          </div>
        </div>
      </div>

      {/* ================= LANDING PAGE ================= */}
      <div className={`w-full h-full absolute inset-0 flex flex-col items-center justify-start pt-24 pb-32 px-4 transition-all duration-1000 overflow-y-auto ${isWorkspaceActive ? 'opacity-0 blur-md scale-95 pointer-events-none' : 'opacity-100 blur-0 scale-100 z-10'}`}>
        <div className="anim-up bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-12 border border-blue-100 dark:border-blue-800/30 shadow-sm">
          Inteligência Fiscal 2026
        </div>
        
        <h1 className="anim-up text-6xl sm:text-8xl md:text-[8rem] font-black tracking-tighter text-center max-w-6xl mb-8 leading-[0.85] text-neutral-900 dark:text-white">
          AUDITORIA <br/><span className="text-blue-600 dark:text-blue-500">AUTÓNOMA.</span>
        </h1>
        
        <p className="anim-up text-lg md:text-2xl text-neutral-500 dark:text-zinc-400 font-medium max-w-3xl text-center mb-16 tracking-tight">
          Nenhuma interface confusa. Anexe a sua vida financeira e deixe a IA auditar o seu imposto contra a malha fina usando a doutrina oficial.
        </p>

        <div className="anim-up w-full max-w-4xl bg-white dark:bg-[#111113] border border-neutral-200 dark:border-zinc-800/80 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row gap-6 w-full mb-8">
            <label className={`flex-1 border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${baseFile ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-neutral-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-neutral-50 dark:hover:bg-white/5'}`}>
              <input type="file" className="hidden" onChange={(e) => e.target.files && setBaseFile(e.target.files[0])} accept="application/pdf,application/json" />
              <svg className={`w-10 h-10 mb-4 ${baseFile ? 'text-blue-500' : 'text-neutral-400 dark:text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="font-bold text-lg">{baseFile ? 'Declaração Anexada' : 'Declaração Base'}</span>
            </label>

            <label className={`flex-1 border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${receiptFiles.length > 0 ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-neutral-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-neutral-50 dark:hover:bg-white/5'}`}>
              <input type="file" className="hidden" onChange={(e) => e.target.files && setReceiptFiles(Array.from(e.target.files))} multiple />
              <svg className={`w-10 h-10 mb-4 ${receiptFiles.length > 0 ? 'text-blue-500' : 'text-neutral-400 dark:text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="font-bold text-lg">{receiptFiles.length > 0 ? `${receiptFiles.length} Ficheiro(s)` : 'Novos Recibos'}</span>
            </label>
          </div>

          <button onClick={startAnalysis} disabled={(!baseFile && receiptFiles.length === 0) || loading} className="w-full bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-xl hover:bg-blue-700 transition-transform hover:scale-[1.01] shadow-xl shadow-blue-900/20 disabled:opacity-50">
            {loading ? 'A PROCESSAR DADOS...' : 'INICIAR AUDITORIA'}
          </button>
        </div>
      </div>

      {/* ================= WORKSPACE (COCKPIT FISCAL) ================= */}
      <div className={`fixed inset-0 z-50 flex justify-center items-center bg-black/80 backdrop-blur-2xl transition-all duration-1000 ${isWorkspaceActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        
        <div className="flex w-full max-w-[1400px] h-[95vh] rounded-[2rem] overflow-hidden bg-white dark:bg-[#0c0c0e] border border-neutral-200 dark:border-zinc-800/60 shadow-2xl mx-4 gap-px">
          
          <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0c0c0e]">
            <div className="flex-shrink-0 p-5 flex justify-between items-center border-b border-neutral-100 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">I</div>
                <span className="font-extrabold tracking-tight text-lg dark:text-white">IRPF Copilot</span>
              </div>
              <button onClick={() => setIsWorkspaceActive(false)} className="px-4 py-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">Encerrar Sessão</button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 space-y-8 custom-scrollbar">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.role === 'system' ? 'justify-center opacity-70' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex-shrink-0 flex items-center justify-center shadow-lg mt-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                  )}
                  <div className={`max-w-[85%] p-5 rounded-3xl text-[15px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-neutral-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-sm' : msg.role === 'system' ? 'bg-transparent border-none text-xs text-center p-0 text-neutral-500 dark:text-neutral-400' : 'bg-neutral-50 border border-neutral-200 dark:bg-[#111113] dark:border-zinc-800/60 text-neutral-800 dark:text-neutral-200 rounded-tl-sm'}`}>
                    <div className="prose prose-sm md:prose-base dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-500 prose-hr:border-zinc-800 max-w-none font-sans">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              
              {isChatLoading && (
                <div className="flex justify-start gap-4">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex-shrink-0 flex items-center justify-center mt-1">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                   </div>
                </div>
              )}
              <div ref={chatEndRef} className="h-4" />
            </div>

            <div className="flex-shrink-0 p-4 md:p-6 bg-white dark:bg-[#0c0c0e] border-t border-neutral-100 dark:border-zinc-800/60">
              <div className="bg-neutral-100 dark:bg-[#161618] border border-neutral-200 dark:border-zinc-800/80 rounded-[2rem] flex items-center gap-2 p-2 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all shadow-inner">
                <label className={`p-3 rounded-full cursor-pointer transition-colors ${isUploadingMidChat ? 'opacity-50 pointer-events-none' : 'hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white'}`} title="Anexar Documento">
                  <input type="file" className="hidden" onChange={handleMidChatUpload} multiple />
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </label>
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Faça uma pergunta tributária ou peça orientação..."
                  className="flex-1 bg-transparent border-none px-2 py-3 outline-none text-neutral-800 dark:text-white text-base font-medium placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                />
                <button onClick={handleSendMessage} disabled={!chatInput.trim() || isChatLoading} className="bg-blue-600 text-white p-4 rounded-full disabled:opacity-50 hover:bg-blue-700 transition-transform hover:scale-105 shadow-md shadow-blue-600/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex w-[400px] flex-col bg-neutral-50 dark:bg-[#111113] border-l border-neutral-200 dark:border-zinc-800/60 overflow-y-auto custom-scrollbar">
            <div className="p-6 border-b border-neutral-200 dark:border-zinc-800/60 sticky top-0 bg-neutral-50/90 dark:bg-[#111113]/90 backdrop-blur-md z-10">
              <h2 className="text-sm font-black text-neutral-500 dark:text-zinc-500 uppercase tracking-widest">Painel de Auditoria</h2>
            </div>
            <div className="p-6 space-y-8">
              {extractedData?.documentos_pendentes?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-yellow-500">⚠️</span>
                    <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Pendências</h3>
                  </div>
                  <ul className="space-y-3">
                    {extractedData.documentos_pendentes.map((doc: string, idx: number) => (
                      <li key={idx} className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 p-3 rounded-xl text-sm text-yellow-800 dark:text-yellow-200/90 leading-relaxed font-medium">
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {extractedData?.plano_acao?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-blue-500">🎯</span>
                    <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Ações a Lançar</h3>
                  </div>
                  <div className="space-y-3">
                    {extractedData.plano_acao.map((acao: any, idx: number) => (
                      <div key={idx} className="bg-white dark:bg-[#161618] border border-neutral-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-neutral-900 dark:text-white leading-tight">{acao.titulo}</h4>
                        </div>
                        <div className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded mb-3 border border-blue-100 dark:border-blue-800/50">
                          {acao.caminho}
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-zinc-400 whitespace-pre-wrap">{acao.detalhes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {extractedData?.otimizacao_futura && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-purple-500">🔮</span>
                    <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Wealth Planning</h3>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 p-5 rounded-xl">
                    <p className="text-sm text-purple-900 dark:text-purple-200/90 leading-relaxed font-medium">
                      {extractedData.otimizacao_futura}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}