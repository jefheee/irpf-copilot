'use client';

import { useState, useEffect, useRef } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };
type Task = { titulo: string; caminho: string; detalhes: string };

// Componente para renderizar quebras de linha e negrito nativamente
const FormattedText = ({ text }: { text: string }) => {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <p key={i} className="mb-2 last:mb-0">
          {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-semibold text-neutral-900 dark:text-white">{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      ))}
    </>
  );
};

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[] | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'assistant' | 'raw'>('assistant');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Já analisei seus documentos e montei o plano de ação ao lado. Você pode **clicar nas tarefas** para ver o passo a passo exato, ou me fazer uma pergunta aqui.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Injetor Global do Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedTask]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setResult(null);
    setSelectedTask(null);
    setChatMessages([{ role: 'assistant', content: 'Olá! Já analisei seus documentos e montei o plano de ação ao lado. Você pode **clicar nas tarefas** para ver o passo a passo exato, ou me fazer uma pergunta aqui.' }]);
    
    const formData = new FormData();
    files.forEach((file) => formData.append('documents', file));

    try {
      const response = await fetch('/api/extract', { method: 'POST', body: formData });
      const data = await response.json();
      setResult(Array.isArray(data) ? data : []);
    } catch (error) {
      alert("Erro ao processar os documentos.");
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
    } catch (err) { alert("Navegador bloqueou a cópia."); }
  };

  const handleClear = () => {
    setFiles([]); setResult(null); setActiveTab('assistant'); setSelectedTask(null);
  };

  const planoAcaoNode = result?.find(r => r.ficha === "Plano de Ação");
  const tarefas: Task[] = planoAcaoNode?.dados?.tarefas || [];

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center py-10 px-4 sm:px-6 transition-colors duration-300">
      <div className="max-w-5xl w-full space-y-8">
        
        <header className="flex justify-between items-center animate-slide-up">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">IRPF Copilot</h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Seu assistente fiscal movido a IA.</p>
          </div>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all hover:scale-105"
            title="Alternar Tema"
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
                <h3 className="font-medium text-sm">Retenção Zero</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Documentos processados em memória RAM e destruídos na hora. Nada é salvo.
                </p>
              </div>
            </div>

            <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-xl p-12 text-center hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors duration-300">
              <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" multiple />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-3">
                <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-full mb-2">
                  <svg className="w-8 h-8 text-neutral-600 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <span className="text-neutral-700 dark:text-neutral-200 font-medium text-lg">
                  {files.length > 0 ? `${files.length} ficheiro(s) selecionado(s)` : 'Anexe PDFs e Imagens aqui'}
                </span>
                <span className="text-sm text-neutral-400">Arraste a declaração do ano passado e os recibos novos.</span>
              </label>
            </div>

            <button 
              onClick={handleUpload}
              disabled={files.length === 0 || loading}
              className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-4 rounded-xl font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  A analisar e cruzar dados...
                </>
              ) : 'Gerar Plano de Ação'}
            </button>
          </div>
        )}

        {result && result.length > 0 && (
          <div className="animate-slide-up space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center pb-2 border-b border-neutral-200 dark:border-neutral-800 gap-4">
              <div className="flex space-x-1 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveTab('assistant')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'assistant' ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  Modo Assistente
                </button>
                <button 
                  onClick={() => setActiveTab('raw')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'raw' ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  Dados Abstraídos
                </button>
              </div>
              <button onClick={handleClear} className="text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition underline underline-offset-4">
                Limpar e Iniciar Novo
              </button>
            </div>

            {activeTab === 'assistant' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Coluna Esquerda: Menu do Plano de Ação */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  <h3 className="text-lg font-medium border-b border-neutral-200 dark:border-neutral-800 pb-2">Plano de Ação</h3>
                  {tarefas.length > 0 ? (
                    tarefas.map((task, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedTask(task)}
                        className={`cursor-pointer transition-all duration-200 p-4 rounded-xl border ${selectedTask === task ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent shadow-md transform scale-[1.02]' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 shadow-sm'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${selectedTask === task ? 'bg-white/20 dark:bg-neutral-900/10' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>
                            {idx + 1}
                          </div>
                          <p className="font-medium text-sm leading-tight">{task.titulo}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-neutral-500 text-sm italic">Nenhum plano gerado. A IA não encontrou ações pendentes.</p>
                  )}
                </div>

                {/* Coluna Direita: Detalhe da Tarefa OU Chat */}
                <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl shadow-sm flex flex-col h-[600px] overflow-hidden">
                  
                  {selectedTask ? (
                    // Tela de Detalhe da Tarefa
                    <div className="flex flex-col h-full animate-slide-up">
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                        <h3 className="font-medium text-sm text-neutral-500 dark:text-neutral-400">Guia Passo a Passo</h3>
                        <button onClick={() => setSelectedTask(null)} className="text-xs font-medium bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 px-3 py-1.5 rounded-md transition">
                          Voltar ao Chat
                        </button>
                      </div>
                      <div className="p-6 overflow-y-auto space-y-6">
                        <h2 className="text-xl font-medium">{selectedTask.titulo}</h2>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Caminho no Programa</label>
                          <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg font-mono text-sm border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
                            {selectedTask.caminho}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">O que fazer</label>
                          <div className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-lg border border-neutral-100 dark:border-neutral-800">
                            <FormattedText text={selectedTask.detalhes} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Tela do Chat
                    <>
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 border-b border-neutral-200 dark:border-neutral-800">
                        <h3 className="font-medium flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                          Pergunte à IA
                        </h3>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-tr-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 rounded-tl-sm'}`}>
                              <FormattedText text={msg.content} />
                            </div>
                          </div>
                        ))}
                        {isChatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-2xl rounded-tl-sm text-sm text-neutral-500 animate-pulse">A analisar...</div>
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
                          placeholder="Digite sua dúvida..."
                          className="flex-1 bg-neutral-100 dark:bg-neutral-800 border-none text-sm rounded-lg px-4 py-2 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white outline-none transition"
                        />
                        <button 
                          onClick={handleSendMessage}
                          disabled={!chatInput.trim() || isChatLoading}
                          className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-2.5 rounded-lg disabled:opacity-50 hover:scale-105 transition-transform"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Aba 2: Dados Abstraídos (Sem alterações na lógica) */}
            {activeTab === 'raw' && (
              <div className="space-y-6 animate-slide-up">
                {result.filter(r => r.ficha !== "Plano de Ação").map((item, index) => (
                  <div key={index} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
                      <h3 className="font-medium">{item.ficha || "Ficha"}</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      {item.dados && Object.entries(item.dados).map(([key, value]) => {
                        const stringValue = String(value);
                        const isLong = stringValue.length > 50;
                        return (
                          <div key={key} className={`flex ${isLong ? 'flex-col space-y-2' : 'flex-col sm:flex-row sm:justify-between sm:items-center'} pb-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0`}>
                            <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            <div className={`flex items-start ${isLong ? 'w-full' : 'sm:max-w-[60%]'} space-x-3`}>
                              <div className={`text-sm bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-md font-mono ${isLong ? 'w-full text-justify' : ''} break-words`}>{stringValue}</div>
                              <button onClick={() => copyToClipboard(stringValue, `${index}-${key}`)} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-2 bg-neutral-50 dark:bg-neutral-800 rounded-md shrink-0 transition">
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