'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStream } from '../hooks/useChatStream';

import { UniversalDocument } from '../types/finance';

interface ChatPanelProps {
  extractedData: UniversalDocument[];
}

export default function ChatPanel({ extractedData }: ChatPanelProps) {
  const { messages, isLoading, sendMessage } = useChatStream();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input.trim(), extractedData);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white w-full border-r border-zinc-800/60 relative">
      
      {/* Header Premium Glassmorphism */}
      <div className="flex-shrink-0 p-8 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-10 transition-colors">
        <h1 className="text-3xl font-black tracking-tighter text-white">IRPF Copilot</h1>
        <p className="text-zinc-500 font-medium text-sm mt-1 tracking-wide uppercase">Cérebro 2: Assistente Tributário</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
            <svg className="w-16 h-16 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-zinc-400 font-medium tracking-tight">Comece a digitar para iniciar a auditoria estruturada.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.role === 'system' ? 'justify-center opacity-70' : ''}`}>
            
            <div className={`max-w-[85%] p-6 rounded-[2rem] leading-relaxed shadow-lg font-medium 
              ${msg.role === 'user' ? 'bg-white text-zinc-950 rounded-tr-sm' : 
                msg.role === 'system' ? 'bg-transparent border border-zinc-800 text-xs text-center p-4 text-zinc-400' :
                'bg-zinc-900 border border-zinc-800/60 text-zinc-200 rounded-tl-sm'}`}>
              
              <div className={`prose prose-base prose-headings:font-black prose-headings:tracking-tighter prose-hr:border-zinc-800 max-w-none font-sans whitespace-pre-wrap ${msg.role !== 'user' ? 'prose-invert prose-a:text-white' : 'prose-zinc prose-p:text-zinc-950'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>

            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
           <div className="flex justify-start">
             <div className="p-6 rounded-[2rem] bg-zinc-900 border border-zinc-800/60 rounded-tl-sm">
                <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
             </div>
           </div>
        )}

        <div ref={chatEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-6 md:p-8 bg-zinc-950 border-t border-zinc-800/60">
        <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-full flex items-center gap-3 p-2 focus-within:ring-2 focus-within:ring-zinc-700 transition-all shadow-inner">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Digite a sua dúvida tributária..."
            className="flex-1 bg-transparent border-none px-6 py-4 outline-none text-white text-lg font-medium placeholder:text-zinc-600 focus:ring-0"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-white text-black p-4 rounded-full disabled:opacity-50 hover:bg-zinc-200 transition-colors mr-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
      
    </div>
  );
}
