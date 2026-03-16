'use client';

import { useState, useEffect, useRef } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };
type Task = { titulo: string; caminho: string; detalhes: string };
type ExtractedData = { documentos_pendentes: string[]; plano_acao: Task[]; fichas: any[] };

// CORREÇÃO: Renderização de Markdown segura e sem espaços indesejados
const FormattedText = ({ text }: { text: string }) => {
  return (
    <div className="space-y-3">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return null;
        
        // Transforma **texto** em <strong>texto</strong> de forma limpa
        const htmlLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-neutral-900 dark:text-white">$1</strong>');
        
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

export default function Home() {
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'assistant' | 'raw'>('assistant');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [dismissedDocs, setDismissedDocs] = useState<number[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedTask]);

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
    setSelectedTask(null);
    setDismissedDocs([]);
    
    const formData = new FormData();
    if (baseFile) formData.append('baseDocument', baseFile);
    receiptFiles.forEach((file) => formData.append('receipts', file));

    try {
      const response = await fetch('/api/extract', { method: 'POST', body: formData });
      const data = await response.json();
      
      if (data.plano_acao || data.fichas) {
        setResult(data as ExtractedData);
        setChatMessages([{ role: 'assistant', content: 'Olá! Já analisei os seus arquivos com base nas **novas regras de 2026**. O plano de ação está no menu lateral. Pode clicar nas tarefas para ver o passo a passo exato, ou fazer uma pergunta aqui.' }]);
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
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Desculpe, ocorreu um erro." }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Erro de conexão. Tente novamente." }]);
    } finally {
      setIsChatLoading(false);
    }
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
    } catch (err) { alert("O navegador bloqueou a cópia."); }
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
    setBaseFile(null); setReceiptFiles([]); setResult(null); setActiveTab('assistant'); setSelectedTask(null); setDismissedDocs([]);
  };

  const dismissDoc = (index: number) => setDismissedDocs(prev => [...prev, index]);
  const visiblePendingDocs = result?.documentos_pendentes?.filter((_, i) => !dismissedDocs.includes(i)) || [];

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center py-10 px-4 sm:px-6 transition-colors duration-300">
      <div className="max-w-6xl w-full space-y-8">
        
        <header className="flex justify-between items-center animate-slide-up">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">IRPF Copilot</h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">O seu assistente fiscal inteligente.</p>
          </div>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all hover:scale-105"
          >
            {isDarkMode ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </header>

        {!result && (
          <div className="animate-slide-up space-y-6" style={{ animationDelay: '0.1s' }}>
            <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 rounded-xl shadow-sm flex items-start space-x-4">
              <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
                <svg className="w-5 h-5 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <div>
                <h3 className="font-medium text-sm">Privacidade & Retenção Zero</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Processamento feito em memória RAM. Os arquivos são destruídos imediatamente após a extração.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-300 flex flex-col items-center justify-center ${baseFile ? 'border-neutral-900 bg-neutral-100 dark:bg-neutral-800' : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400'}`}>
                <input type="file" id="base-upload" className="hidden" onChange={handleBaseFileChange} accept="application/pdf,application/json" />
                <label htmlFor="base-upload" className="cursor-pointer flex flex-col items-center space-y-3 w-full">
                  <div className={`p-4 rounded-full mb-2 ${baseFile ? 'bg-neutral-900 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <span className="font-medium text-lg text-neutral-800 dark:text-neutral-200">
                    {baseFile ? '✓ Declaração Base Anexada' : 'Declaração Anterior (PDF ou JSON)'}
                  </span>
                  <span className="text-sm text-neutral-400 px-4">Anexe os dados do IRPF do ano passado.</span>
                  {baseFile && <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono mt-2">{baseFile.name}</span>}
                </label>
              </div>

              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-300 flex flex-col items-center justify-center ${receiptFiles.length > 0 ? 'border-neutral-900 bg-neutral-100 dark:bg-neutral-800' : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400'}`}>
                <input type="file" id="receipts-upload" className="hidden" onChange={handleReceiptsChange} accept="image/*,application/pdf" multiple />
                <label htmlFor="receipts-upload" className="cursor-pointer flex flex-col items-center space-y-3 w-full">
                  <div className={`p-4 rounded-full mb-2 ${receiptFiles.length > 0 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <span className="font-medium text-lg text-neutral-800 dark:text-neutral-200">
                    {receiptFiles.length > 0 ? `✓ ${receiptFiles.length} Arquivo(s) Anexado(s)` : 'Recibos do Ano Atual'}
                  </span>
                  <span className="text-sm text-neutral-400 px-4">Informes de rendimento, notas, faturas.</span>
                </label>
              </div>
            </div>

            <button 
              onClick={handleUpload}
              disabled={(!baseFile && receiptFiles.length === 0) || loading}
              className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-4 rounded-xl font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  A auditar documentos...
                </>
              ) : 'Analisar e Auditar'}
            </button>
          </div>
        )}

        {result && (!result.plano_acao && (!result.fichas || result.fichas.length === 0)) && (
          <div className="animate-fade-in bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-6 rounded-xl text-center">
            <h3 className="text-red-800 dark:text-red-400 font-medium">Nenhum dado fiscal válido encontrado nos arquivos.</h3>
            <button onClick={handleClear} className="mt-4 text-sm font-medium text-red-700 dark:text-red-400 underline">Tentar novamente</button>
          </div>
        )}

        {result && (result.plano_acao || (result.fichas && result.fichas.length > 0)) && (
          <div className="animate-slide-up space-y-6 w-full">
            
            {/* CORREÇÃO: Alerta amarelo com contraste lapidado para Light e Dark Mode */}
            {visiblePendingDocs.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 p-4 rounded-xl flex items-start gap-3">
                <div className="mt-1 text-amber-600 dark:text-amber-500 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-amber-800 dark:text-amber-400">Atenção: Possíveis documentos em falta</h3>
                  <div className="mt-3 space-y-2">
                    {result.documentos_pendentes.map((doc, idx) => {
                      if (dismissedDocs.includes(idx)) return null;
                      return (
                        <div key={idx} className="flex justify-between items-center gap-3 bg-white/80 dark:bg-neutral-900/50 px-3 py-2.5 rounded-lg border border-amber-100 dark:border-amber-800/40 shadow-sm">
                          <span className="text-xs text-amber-900 dark:text-amber-200 font-medium">{doc}</span>
                          <button 
                            onClick={() => dismissDoc(idx)}
                            className="p-1.5 text-amber-500 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-300 bg-amber-100/50 dark:bg-amber-800/30 rounded-md transition-colors shrink-0"
                            title="Remover aviso"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center pb-2 border-b border-neutral-200 dark:border-neutral-800 gap-4">
              <div className="flex space-x-1 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveTab('assistant')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'assistant' ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  Plano de Ação
                </button>
                <button 
                  onClick={() => setActiveTab('raw')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'raw' ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  Dados Extraídos
                </button>
              </div>
              <button onClick={handleClear} className="text-sm font-medium text-neutral-500 hover:text-red-500 transition underline underline-offset-4">
                Encerrar Sessão
              </button>
            </div>

            {activeTab === 'assistant' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                <div className="lg:col-span-5 space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {result.plano_acao && result.plano_acao.length > 0 ? (
                    result.plano_acao.map((task, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedTask(task)}
                        className={`cursor-pointer transition-all duration-200 p-4 rounded-xl border ${selectedTask === task ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md translate-x-1' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 shadow-sm'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 mt-0.5 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${selectedTask === task ? 'bg-white/20 dark:bg-neutral-900/10 text-white dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>
                            {idx + 1}
                          </div>
                          <p className="font-medium text-sm leading-snug">{task.titulo}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-neutral-500 text-sm italic">Nenhuma ação estruturada encontrada.</p>
                  )}
                </div>

                <div className="lg:col-span-7 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl shadow-sm flex flex-col h-[600px] overflow-hidden">
                  {selectedTask ? (
                    <div className="flex flex-col h-full animate-slide-up">
                      <div className="bg-neutral-50 dark:bg-neutral-800/80 p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                        <h3 className="font-medium text-sm text-neutral-500 dark:text-neutral-400">Guia de Preenchimento</h3>
                        <button onClick={() => setSelectedTask(null)} className="text-xs font-medium bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 px-3 py-1.5 rounded-md transition flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Voltar ao Chat
                        </button>
                      </div>
                      <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">{selectedTask.titulo}</h2>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> Onde clicar no PGD
                          </label>
                          <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                            <p className="font-mono text-sm text-neutral-800 dark:text-neutral-200 font-medium tracking-tight">{selectedTask.caminho}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> Como Preencher
                          </label>
                          <div className="bg-neutral-50 dark:bg-neutral-950/50 p-5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                            <FormattedText text={selectedTask.detalhes} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-neutral-50 dark:bg-neutral-800/80 p-4 border-b border-neutral-200 dark:border-neutral-800">
                        <h3 className="font-medium flex items-center gap-2">
                          <svg className="w-5 h-5 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> Chat Especialista
                        </h3>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {chatMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {/* CORREÇÃO: Contraste do Chat. User é sempre Escuro no Light, Branco no Dark. */}
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 rounded-tr-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 rounded-tl-sm'}`}>
                              <FormattedText text={msg.content} />
                            </div>
                          </div>
                        ))}
                        {isChatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-2xl rounded-tl-sm text-sm text-neutral-500 animate-pulse flex items-center gap-2">
                              <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></span>
                              <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                              <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex gap-2">
                        <input 
                          type="text" 
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Pergunte sobre seus impostos..."
                          className="flex-1 bg-neutral-100 dark:bg-neutral-800 border-none text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-neutral-900 outline-none transition"
                        />
                        <button 
                          onClick={handleSendMessage}
                          disabled={!chatInput.trim() || isChatLoading}
                          className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-3 rounded-xl disabled:opacity-50 transition flex items-center justify-center"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="space-y-6 animate-slide-up w-full">
                {result.fichas && result.fichas.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
                      <h3 className="font-semibold text-neutral-800 dark:text-neutral-200">{item.ficha ? formatLabel(item.ficha) : "Ficha"}</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      {item.dados && Object.entries(item.dados).map(([key, value]) => {
                        const stringValue = String(value);
                        const isLong = stringValue.length > 50;
                        return (
                          <div key={key} className={`flex ${isLong ? 'flex-col space-y-2' : 'flex-col sm:flex-row sm:justify-between sm:items-center'} pb-3 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 last:pb-0`}>
                            <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{formatLabel(key)}</span>
                            <div className={`flex items-start ${isLong ? 'w-full' : 'sm:max-w-[60%]'} space-x-3`}>
                              <div className={`text-sm bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 rounded-md font-mono ${isLong ? 'w-full text-justify' : ''} break-words text-neutral-800 dark:text-neutral-300`}>{stringValue}</div>
                              <button onClick={() => copyToClipboard(stringValue, `${index}-${key}`)} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-2 bg-neutral-50 dark:bg-neutral-800 rounded-md shrink-0 transition" title="Copiar">
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
            )}
          </div>
        )}
      </div>
    </main>
  );
}