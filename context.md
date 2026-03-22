# Resumo de Contexto Mestre: IRPF Copilot 2026

## 📌 Visão Geral do Projeto
O **IRPF Copilot** é uma aplicação Tax-Tech Premium (*Single Page Application*) que atua como consultor tributário autónomo para o IRPF 2026. O seu diferencial é a transição da simples "informação utilitária" para a "informação seletiva" (*Wealth Optimization*), focado em maximizar restituições e blindar o utilizador contra a malha fina.

## 🏗️ Stack Tecnológica e Arquitetura Multi-Agente
* **Front-end:** Next.js 16.2 (Turbopack), React, Tailwind CSS v4, GSAP.
* **Base de Dados / RAG:** Supabase com `pgvector` ancorado em +400 páginas de manuais da RFB e leis atualizadas.
* **Cérebro 1 (Extração/IDP):** Google Gemini 1.5 Flash (`/api/extract`). Lê PDFs e imagens, estruturando um JSON rígido (Pendências, Plano de Ação, Visão de Futuro).
* **Cérebro 2 (Raciocínio/Chat):** Groq + `llama-3.3-70b-versatile` (`/api/chat`). Gera respostas conversacionais ultrarrápidas baseadas nos vetores da lei.

## 🎨 Paradigma de Design e IHC (Validado Academicamente)
O projeto foi validado sob a ótica da Interação Humano-Computador (IHC) para redução drástica de carga cognitiva:
* **Landing Page Minimalista:** Sem menus; apenas *drag-and-drop* (Lei de Hick / Affordance limpa).
* **Cockpit Fiscal (Split-Screen):** O ecrã divide-se em Chat (Esquerda) e Dashboard Analítico Fixo (Direita), respeitando a heurística de "Reconhecimento em vez de memorização".
* **Menu Overlay "GTA VI":** Painel lateral para configurações (Modo Claro/Escuro) e links obrigatórios (LGPD).
* **Prevenção de Erros (Poka-Yoke):** Botão de anexo (clipe de papel) no chat para *upload* contínuo de documentos em falta sem quebrar a sessão.

## 🐛 Histórico de Correções Críticas
1. **Colapso do Tailwind v4 (`@theme`):** O ficheiro `globals.css` foi refatorado para isolar as variáveis no `@theme` e mover o CSS customizado para `@layer components`. O plugin `@tailwindcss/typography` foi ativado para renderizar o Markdown perfeitamente no chat.
2. **Erro 500 no Parse de JSON (Gemini):** Implementação de uma blindagem Regex em hexadecimal (`[\x00-\x1F]+`) para aniquilar quebras de linha literais geradas pela IA, contornando simultaneamente um *bug* de compilação do Turbopack.
3. **Depreciação Groq:** Modelo atualizado para `llama-3.3-70b-versatile` após falha 400.
4. **Middleware Next.js 16:** Ficheiro renomeado e função estritamente tipada como `export function proxy`. As credenciais estáticas foram removidas e migradas para `.env.local` (`ADMIN_USER` e `ADMIN_PASS`).

## 🚀 Plano de Ação Integrado (Próximos Passos)

**Fase 1: Execução Imediata (Design & Compliance)**
* [ ] **Branding:** Substituir o texto do cabeçalho pelo logótipo oficial do IRPF Copilot (alinhado à estética Apple/Rockstar).
* [ ] **Legal & LGPD:** Criar o conteúdo estático real para os *links* do menu lateral (Política de Privacidade, Cookies, Solicitação de Dados).

**Fase 2: Visão Académica e Evolução Cognitiva**
* [ ] **Acessibilidade (WCAG):** Revisão de contrastes e implementação de `aria-labels` para navegação por teclado.
* [ ] **IA Proativa (Tutor Contextual):** Afinar o *System Prompt* do Agente 2 para antecipar a próxima dúvida do utilizador, neutralizando o seu "Estado Anómalo de Conhecimento".
* [ ] **Testes A/B (Design Paralelo):** Testar a hierarquia visual dos *cards* no Painel Analítico para otimizar ainda mais a absorção de dados.

## Regras de Engenharia para a IA (AntiGravity):
1. **Stack Obrigatória:** Use APENAS Next.js 16 (Turbopack), Tailwind CSS v4 (sem tailwind.config, tudo no globals.css) e React Client Components apenas quando necessário (`'use client'`).
2. **Design System:** Mantenha a estética "Premium/Rockstar" - fundo escuro (zinc-950), texto contrastante, sem bordas agressivas, transições GSAP fluidas. Zero componentes isolados; tudo deve seguir o "Cockpit Fiscal" de tela cheia.
3. **Multi-Agente:** Nunca altere as rotas `/api/extract` (Gemini Flash para IDP) e `/api/chat` (Groq/Llama 3.3 para RAG) sem permissão explícita.
4. **Sem Alucinações:** Leia sempre este ficheiro `context.md` antes de propor alterações estruturais.