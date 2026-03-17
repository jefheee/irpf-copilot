'use client';
import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const container = useRef<HTMLDivElement>(null);
  const [isWorkspaceActive, setIsWorkspaceActive] = useState(false);

  // Animações de entrada da Landing Page
  useGSAP(() => {
    if (!isWorkspaceActive) {
      gsap.from('.card-upload', {
        y: 40,
        opacity: 0,
        stagger: 0.2,
        duration: 0.8,
        ease: 'power3.out'
      });
    }
  }, { scope: container, dependencies: [isWorkspaceActive] });

  // Transição fluida para o Chat sem mudar de página
  const startAnalysis = () => {
    gsap.to('.landing-content', {
      opacity: 0,
      y: -50,
      duration: 0.5,
      onComplete: () => setIsWorkspaceActive(true)
    });
  };

  return (
    <main ref={container} className="min-h-screen bg-white dark:bg-zinc-950 text-neutral-900 dark:text-white font-sans overflow-x-hidden">
      {/* HEADER FIXO */}
      <header className="fixed top-0 w-full p-6 flex justify-between items-center z-50 mix-blend-difference">
         <span className="font-extrabold tracking-tighter text-xl">IRPF Copilot</span>
         {/* Botão de Dark Mode aqui */}
      </header>

      {!isWorkspaceActive ? (
        <div className="landing-content flex flex-col items-center justify-center min-h-screen pt-20 px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-center max-w-4xl mb-6">
            A sua declaração de IRPF, <br/><span className="text-blue-600">sem medo da malha fina.</span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-500 max-w-2xl text-center mb-16">
            Arraste os seus documentos, recibos ou PDFs oficiais. A nossa inteligência cruza os dados com a lei e faz o trabalho pesado.
          </p>

          <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl mb-10">
            {/* Cards de Upload Pontilhados */}
            <div className="card-upload flex-1 border-2 border-dashed border-neutral-300 dark:border-zinc-700 rounded-3xl p-10 flex flex-col items-center cursor-pointer hover:border-blue-500 transition-colors">
               <span className="font-semibold">Declaração de 2025</span>
            </div>
            <div className="card-upload flex-1 border-2 border-dashed border-neutral-300 dark:border-zinc-700 rounded-3xl p-10 flex flex-col items-center cursor-pointer hover:border-blue-500 transition-colors">
               <span className="font-semibold">Novos Recibos (PDF/TXT)</span>
            </div>
          </div>

          <button onClick={startAnalysis} className="card-upload bg-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-colors w-full max-w-md shadow-2xl">
            Analisar Documentos
          </button>
        </div>
      ) : (
        /* WORKSPACE DO CHAT (Surge após o fade out) */
        <div className="workspace-content animate-fade-in flex flex-col items-center min-h-screen pt-24 pb-10 px-4 max-w-5xl mx-auto">
           {/* O novo design centralizado do chat entra aqui */}
        </div>
      )}
      
      {/* SEÇÕES INFERIORES PARA SCROLL (Trust, LGPD, Flow) entram aqui embaixo */}
    </main>
  );
}