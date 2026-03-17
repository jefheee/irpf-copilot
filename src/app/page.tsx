'use client';

import { useState, useEffect, useRef } from 'react';

type Message = { role: 'user' | 'assistant'; content: string; isNew?: boolean };
type Task = { titulo: string; caminho: string; detalhes: string };
type ExtractedData = { documentos_pendentes: string[]; plano_acao: Task[]; fichas: any[] };

const FormattedText = ({ text }: { text: string }) => {
  return (
    <div className="space-y-4">
      {text.split('\n').map((line, i) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;

        // CORREÇÃO: Transforma "---" numa linha divisória elegante
        if (trimmedLine === '---') {
          return <hr key={i} className="my-4 border-t border-neutral-200 dark:border-zinc-700/50" />;
        }
        
        if (trimmedLine.startsWith('###')) {
          return <h4 key={i} className="text-base font-bold text-neutral-900 dark:text-white mt-5 mb-2">{trimmedLine.replace(/^#+\s*/, '')}</h4>;
        }

        if (trimmedLine.startsWith('* ')) {
          const htmlLine = trimmedLine.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-neutral-900 dark:text-white">$1</strong>');
          return (
            <div key={i} className="flex items-start gap-2 ml-2 mt-1">
              <span className="text-blue-500 mt-1.5 text-xs">✦</span>
              <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300" dangerouslySetInnerHTML={{ __html: htmlLine }} />
            </div>
          );
        }

        const htmlLine = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-neutral-900 dark:text-white">$1</strong>');
        return (
          <p 
            key={i} 
            className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300"
            dangerouslySetInnerHTML={{ __html: htmlLine }}
          />
        );
      })}
    </div>
  );
};

const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, 6); // Aumentei a velocidade para 6ms para o utilizador não ficar muito tempo à espera
    
    return () => clearInterval(timer);
  }, [text]);

  return <FormattedText text={displayedText} />;
};

export default function Home() {
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'assistant' | 'raw'>('assistant');
  
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState(''); // O input agora começa estritamente vazio
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [dismissedDocs, setDismissedDocs] = useState<number[]>([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, result]);

  const handleBaseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setBaseFile(e.target.files[0]);
  };

  const handleReceiptsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setReceiptFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (!baseFile && receiptFiles.length === 0) return;
    setLoading(true);
    setResult(null);
    setDismissedDocs([]);
    setShowAlertsModal(false);
    
    const formData = new FormData();
    if (baseFile) formData.append('baseDocument', baseFile);
    receiptFiles.forEach((file) => formData.append('receipts', file));

    try {
      const response = await fetch('/api/extract', { method: 'POST', body: formData });
      const data = await response.json();
      
      if (data.plano_acao || data.fichas) {
        setResult(data as ExtractedData);
        setChatMessages([{ 
          role: 'assistant', 
          content: 'Olá! Sou o seu Consultor Tributário Pessoal. 🎉\n\nJá analisei tudo o que me enviou e cruzei com as novas regras de 2026 da Receita Federal. Preparei o seu **Plano de Ação** ali no menu lateral para garantir a sua maior restituição possível.\n\nClique em qualquer tarefa para eu lhe mostrar exatamente onde clicar, ou pergunte-me qualquer dúvida!', 
          isNew: true 
        }]);
      } else {
        setResult({ documentos_pendentes: [], plano_acao: [], fichas: [] });
      }
    } catch (error) {
      alert("Erro ao processar os arquivos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !result) return;
    const newMessage: Message = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.content, contextData: result })
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Desculpe, ocorreu um erro.", isNew: true }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Falha de conexão. Tente novamente.", isNew: true }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Simula uma conversa no chat quando o utilizador clica numa tarefa
  const handleCardClick = (task: Task) => {
    setChatMessages(prev => [
      ...prev, 
      { role: 'user', content: `Como devo lançar: ${task.titulo}?` },
      { 
        role: 'assistant', 
        content: `### ${task.titulo}\n**Onde clicar:**\n${task.caminho}\n\n**Como preencher:**\n${task.detalhes}`, 
        isNew: true 
      }
    ]);
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text; textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus(); textArea.select(); document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) { alert("Cópia bloqueada pelo navegador."); }
  };

  const formatLabel = (key: string) => {
    let formatted = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    formatted = formatted.toLowerCase().split(' ').map(word => {
        const doNotCapitalize = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'por', 'para', 'com'];
        if (doNotCapitalize.includes(word) && word !== formatted.toLowerCase().split(' ')[0]) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
    
    const acronyms: { [key: string]: string } = {
      'Cpf': 'CPF', 'Cnpj': 'CNPJ', 'Irrf': 'IRRF', 'Irpf': 'IRPF',
      'Darf': 'DARF', 'B3': 'B3', 'Fii': 'FII', 'Etf': 'ETF', 
      'Inss': 'INSS', '13º': '13º', 'Pis': 'PIS', 'Cofins': 'COFINS', 'Pj': 'PJ', 'Pf': 'PF'
    };
    for (const [wrong, right] of Object.entries(acronyms)) {
      formatted = formatted.replace(new RegExp(`\\b${wrong}\\b`, 'g'), right);
    }
    return formatted;
  };

  const handleClear = () => {
    setBaseFile(null); setReceiptFiles([]); setResult(null); setActiveTab('assistant'); setDismissedDocs([]); setShowAlertsModal(false);
  };

  const visiblePendingDocs = result?.documentos_pendentes?.filter((_, i) => !dismissedDocs.includes(i)) || [];

  return (
    <main className="h-screen flex flex-col bg-neutral-50 dark:bg-zinc-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-300 overflow-hidden">
      
{/* HEADER FIXO E ESTILIZADO (Estilo Premium/Glassmorphism) */}
<header className="flex justify-between items-center px-6 py-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-neutral-200/80 dark:border-zinc-800/80 sticky top-0 z-50 transition-colors duration-300">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-blue-600 to-blue-500 p-1.5 rounded-lg shadow-sm shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
            IRPF Copilot
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Botão de Alerta Compacto e Chamativo */}
          {result && visiblePendingDocs.length > 0 && (
            <div className="relative">
              <button 
                onClick={() => setShowAlertsModal(!showAlertsModal)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                title="Avisos Pendentes"
              >
                <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="text-xs font-bold">{visiblePendingDocs.length} Avisos</span>
              </button>

              {/* Modal de Alerta (Drop-down) */}
              {showAlertsModal && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-slide-up z-50">
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 border-b border-red-100 dark:border-red-800/30 flex justify-between items-center">
                    <span className="font-semibold text-red-800 dark:text-red-400 text-sm">Faltam estes documentos</span>
                    <button onClick={() => setShowAlertsModal(false)} className="text-red-600 hover:text-red-800"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {result.documentos_pendentes.map((doc, idx) => {
                      if (dismissedDocs.includes(idx)) return null;
                      return (
                        <div key={idx} className="flex justify-between items-center p-2 hover:bg-neutral-50 dark:hover:bg-zinc-700/50 rounded-lg group border border-transparent hover:border-neutral-200 dark:hover:border-zinc-600 transition-all">
                          <span className="text-xs text-neutral-700 dark:text-neutral-300">{doc}</span>
                          <button onClick={() => setDismissedDocs(prev => [...prev, idx])} className="opacity-0 group-hover:opacity-100 text-red-500 p-1 bg-red-50 dark:bg-red-900/30 rounded" title="Dispensar aviso">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {result && (
            <button onClick={handleClear} className="text-xs font-semibold text-neutral-500 hover:text-red-500 transition px-2">Limpar Tudo</button>
          )}

          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-all"
          >
            {isDarkMode ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
          </button>
        </div>
      </header>

{/* ESTADO 1: TELA INICIAL COM ALMA E PROPÓSITO */}
{!result && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-slide-up w-full max-w-4xl mx-auto overflow-y-auto">
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-blue-100 dark:border-blue-800/30">
            Inteligência Fiscal 2026
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-center text-neutral-900 dark:text-white mb-4 tracking-tight leading-tight">
            A sua declaração de IRPF, <br/><span className="text-blue-600 dark:text-blue-400">sem medo da malha fina.</span>
          </h2>
          <p className="text-neutral-600 dark:text-zinc-400 text-center mb-2 max-w-2xl text-lg">
            Esqueça a confusão do programa da Receita. A nossa inteligência analisa os seus documentos e cria um <strong>guia exato de onde clicar e o que preencher</strong> para maximizar a sua restituição.
          </p>
          <p className="text-neutral-400 dark:text-zinc-500 text-center mb-10 max-w-xl text-sm">
            Basta enviar os seus recibos novos. O envio da declaração do ano passado é <strong>opcional</strong>, mas ajuda-nos a mapear a sua evolução patrimonial.
          </p>

          <div className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl shadow-xl p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors flex flex-col items-center justify-center ${baseFile ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-neutral-300 dark:border-zinc-700 bg-neutral-50 dark:bg-zinc-800/50 hover:border-blue-400 cursor-pointer'}`}>
                <input type="file" id="base-upload" className="hidden" onChange={handleBaseFileChange} accept="application/pdf,application/json" />
                <label htmlFor="base-upload" className="cursor-pointer w-full flex flex-col items-center">
                  <div className={`p-3 rounded-full mb-3 ${baseFile ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-white dark:bg-zinc-800 shadow-sm text-neutral-500 dark:text-zinc-400'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <span className="font-semibold text-sm text-neutral-800 dark:text-zinc-200">{baseFile ? 'Declaração Anexada' : 'Declaração de 2025'}</span>
                  <span className="text-xs text-neutral-400 mt-1 font-medium bg-neutral-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">(Opcional)</span>
                  {baseFile && <span className="text-xs text-blue-600 mt-2 line-clamp-1 max-w-[200px]">{baseFile.name}</span>}
                </label>
              </div>

              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors flex flex-col items-center justify-center ${receiptFiles.length > 0 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-neutral-300 dark:border-zinc-700 bg-neutral-50 dark:bg-zinc-800/50 hover:border-blue-400 cursor-pointer'}`}>
                <input type="file" id="receipts-upload" className="hidden" onChange={handleReceiptsChange} accept="image/*,application/pdf" multiple />
                <label htmlFor="receipts-upload" className="cursor-pointer w-full flex flex-col items-center">
                  <div className={`p-3 rounded-full mb-3 ${receiptFiles.length > 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-white dark:bg-zinc-800 shadow-sm text-blue-500 dark:text-blue-400'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <span className="font-semibold text-sm text-neutral-800 dark:text-zinc-200">{receiptFiles.length > 0 ? `${receiptFiles.length} Ficheiro(s) Anexado(s)` : 'Novos Recibos e Informes'}</span>
                  <span className="text-xs text-blue-500 mt-1 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">Onde a mágica acontece</span>
                </label>
              </div>
            </div>

            <button 
              onClick={handleUpload}
              disabled={(!baseFile && receiptFiles.length === 0) || loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  A analisar os seus documentos...
                </>
              ) : 'Analisar e Criar Guia de Preenchimento'}
            </button>

            {/* Escudo de Segurança LGPD */}
            <div className="flex items-center justify-center gap-2 pt-2 text-neutral-400 dark:text-zinc-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <span className="text-[11px] font-medium tracking-wide uppercase">Criptografia de Ponta a Ponta • Protegido sob a LGPD • Zero Data Retention</span>
            </div>
            
          </div>
        </div>
      )}

      {/* ESTADO 2: WORKSPACE (SIDEBAR + CHAT/DADOS) */}
      {result && (
        <div className="flex-1 flex overflow-hidden bg-neutral-50 dark:bg-zinc-950 animate-fade-in w-full max-w-[1400px] mx-auto border-x border-neutral-200 dark:border-zinc-800 shadow-2xl">
          
          {/* SIDEBAR ESQUERDA: PLANO DE AÇÃO (Estilo Menu do Canva/ChatGPT) */}
          <aside className="w-80 flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-neutral-200 dark:border-zinc-800 hidden md:flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <div className="p-5 border-b border-neutral-100 dark:border-zinc-800/50">
              <h2 className="font-bold text-xs uppercase tracking-widest text-neutral-500 dark:text-zinc-400 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                Ações Pendentes
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {result.plano_acao && result.plano_acao.length > 0 ? (
                result.plano_acao.map((task, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => { setActiveTab('assistant'); handleCardClick(task); }}
                    className="w-full text-left p-3 rounded-xl bg-neutral-50 dark:bg-zinc-800/50 border border-neutral-200/50 dark:border-zinc-700/30 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-white dark:hover:bg-zinc-800 transition-all group flex items-start gap-3 shadow-sm hover:shadow"
                  >
                    <div className="w-6 h-6 mt-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex flex-shrink-0 items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-neutral-800 dark:text-zinc-200 line-clamp-2 leading-snug">{task.titulo}</p>
                      <span className="text-[10px] text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">Pedir ajuda à IA &rarr;</span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-neutral-400 text-sm italic text-center mt-10">Tudo preenchido!</p>
              )}
            </div>
          </aside>

          {/* ÁREA PRINCIPAL DIREITA (CHAT ou DADOS) */}
          <main className="flex-1 flex flex-col relative bg-neutral-50 dark:bg-zinc-950 overflow-hidden">
            
            {/* TABS SUPERIORES */}
            <div className="absolute top-0 left-0 right-0 z-20 flex justify-center p-3 pointer-events-none">
              <div className="flex bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-1 rounded-xl shadow-sm border border-neutral-200/50 dark:border-zinc-700/50 pointer-events-auto">
                <button onClick={() => setActiveTab('assistant')} className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'assistant' ? 'bg-white dark:bg-zinc-800 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>Assistente IA</button>
                <button onClick={() => setActiveTab('raw')} className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'raw' ? 'bg-white dark:bg-zinc-800 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>Dados Extraídos</button>
              </div>
            </div>

            {/* CONTEÚDO DO CHAT (O "display: hidden" garante que a IA não esquece a digitação) */}
            <div className={`flex-1 flex flex-col w-full h-full relative ${activeTab === 'assistant' ? 'flex' : 'hidden'}`}>
              
{/* O Chat em si COM AVATARES */}
<div className="flex-1 overflow-y-auto px-4 md:px-10 pt-20 pb-32 space-y-6 custom-scrollbar scroll-smooth">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex animate-message gap-3 ${msg.role === 'user' ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
                    
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm mt-1 ${msg.role === 'user' ? 'bg-neutral-200 dark:bg-zinc-700 text-neutral-500 dark:text-zinc-400' : 'bg-gradient-to-br from-blue-600 to-blue-500 text-white'}`}>
                      {msg.role === 'user' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      )}
                    </div>

                    {/* Balão de Mensagem */}
                    <div className={`max-w-[80%] md:max-w-[70%] p-5 rounded-3xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-neutral-900 text-white dark:bg-zinc-200 dark:text-zinc-900 rounded-tr-sm' : 'bg-white border border-neutral-200 dark:bg-zinc-900 dark:border-zinc-800 text-neutral-800 dark:text-neutral-200 rounded-tl-sm'}`}>
                      {msg.isNew && msg.role === 'assistant' ? <TypewriterText text={msg.content} /> : <FormattedText text={msg.content} />}
                    </div>
                  </div>
                ))}
                
                {isChatLoading && (
                  <div className="flex justify-start gap-3 animate-message">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white flex flex-shrink-0 items-center justify-center shadow-sm mt-1">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <div className="bg-white border border-neutral-200 dark:bg-zinc-900 dark:border-zinc-800 p-4 rounded-3xl rounded-tl-sm w-20 h-12 flex items-center justify-center gap-1.5 shadow-sm">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></span>
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} className="h-4" />
              </div>

              {/* INPUT INFERIOR FLUTUANTE ESTILO CANVA/CHATGPT */}
              <div className="absolute bottom-6 left-4 right-4 md:left-10 md:right-10 z-20">
                <div className="bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-full shadow-2xl p-2 flex items-center gap-3 relative focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                  <div className="pl-4 text-blue-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </div>
                  {/* BUG CORRIGIDO: value={} e placeholder="" estão estritamente separados agora */}
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Pergunte à IA ou clique num passo ao lado..."
                    className="flex-1 bg-transparent border-none text-base px-2 py-3 outline-none text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-zinc-500"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="bg-blue-600 text-white p-3.5 rounded-full disabled:opacity-50 hover:bg-blue-700 transition-transform hover:scale-105 shadow-md mr-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
                <div className="text-center mt-3">
                  <span className="text-[10px] text-neutral-400 dark:text-zinc-600 font-medium tracking-wide">A IA PODE COMETER ERROS FISCAIS. VERIFIQUE AS INFORMAÇÕES GERADAS.</span>
                </div>
              </div>
            </div>

            {/* ABA DE DADOS EXTRAÍDOS */}
            <div className={`flex-1 w-full h-full overflow-y-auto px-4 md:px-10 pt-20 pb-10 space-y-6 custom-scrollbar ${activeTab === 'raw' ? 'block' : 'hidden'}`}>
              <div className="max-w-4xl mx-auto space-y-6">
                {result.fichas && result.fichas.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-shadow">
                    <div className="bg-neutral-50 dark:bg-zinc-800/50 px-5 py-4 border-b border-neutral-200 dark:border-zinc-800 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <h3 className="font-bold text-neutral-800 dark:text-zinc-200">{item.ficha ? formatLabel(item.ficha) : "Ficha"}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {item.dados && Object.entries(item.dados).map(([key, value]) => {
                        const stringValue = String(value);
                        const isLong = stringValue.length > 50;
                        return (
                          <div key={key} className={`flex ${isLong ? 'flex-col space-y-2' : 'flex-col sm:flex-row sm:justify-between sm:items-start'} pb-4 border-b border-neutral-100 dark:border-zinc-800/50 last:border-0 last:pb-0`}>
                            <span className="text-sm text-neutral-500 dark:text-zinc-400 font-semibold mt-1">{formatLabel(key)}</span>
                            <div className={`flex items-start ${isLong ? 'w-full' : 'sm:max-w-[65%]'} space-x-3`}>
                              <div className={`text-sm bg-neutral-50 dark:bg-zinc-800/30 px-4 py-2.5 rounded-xl font-mono ${isLong ? 'w-full text-justify' : ''} break-words text-neutral-800 dark:text-zinc-300 border border-neutral-200/50 dark:border-zinc-700/30 shadow-inner`}>{stringValue}</div>
                              <button onClick={() => copyToClipboard(stringValue, `${index}-${key}`)} className="text-neutral-400 hover:text-blue-500 p-2.5 bg-neutral-50 dark:bg-zinc-800 rounded-xl shrink-0 transition-colors border border-neutral-200/50 dark:border-zinc-700/50" title="Copiar">
                                {copiedKey === `${index}-${key}` ? <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      )}
    </main>
  )};