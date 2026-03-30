import ChatPanel from '../components/ChatPanel';

export default function Home() {
  return (
    <main className="flex w-full h-screen bg-white overflow-hidden text-zinc-950 font-sans">
      
      {/* Lado Esquerdo: Chat (40%) */}
      <div className="w-full md:w-[40%] h-full flex-shrink-0">
        <ChatPanel />
      </div>

      {/* Lado Direito: Whiteboard (60%) */}
      <div className="hidden md:flex w-[60%] h-full flex-col justify-center items-center bg-white border-l border-zinc-200 shadow-[-10px_0_30px_rgba(0,0,0,0.03)] z-10 relative">
        <div className="text-center space-y-6">
          <svg className="w-16 h-16 text-zinc-300 mx-auto animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          <h2 className="text-4xl font-black tracking-tighter text-zinc-800">
            Aguardando contexto <br /> de extração...
          </h2>
          <p className="text-zinc-500 font-medium max-w-sm mx-auto tracking-tight">
            Os dados consolidados da B3 e PDFs carregados aparecerão neste painel na próxima iteração do sistema.
          </p>
        </div>
        
        {/* Placeholder Watermark */}
        <div className="absolute bottom-10 right-10 opacity-20 pointer-events-none">
           <span className="text-[10rem] font-black tracking-tighter text-zinc-100">IRPF '26</span>
        </div>
      </div>
      
    </main>
  );
}