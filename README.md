-----

# 🦁 IRPF Copilot 2026: O seu Cofre Digital de Wealth Optimization

O **IRPF Copilot 2026** é uma plataforma Tax-Tech Premium desenvolvida para transcender o paradigma de "preenchimento de formulários" da Receita Federal. Operando sob uma arquitetura de Inteligência Artificial Multi-Agente, o sistema atua como uma camada de inteligência fiscal estratégica, garantindo conformidade absoluta, mitigação de risco de malha fina e otimização patrimonial (Wealth Optimization).

-----

## 🎯 A História e o Posicionamento do Projeto

O sistema tributário brasileiro é um labirinto normativo. A maioria das soluções no mercado apenas automatiza a transferência de dados para a Receita Federal, sem aplicar inteligência para defender o contribuinte. O IRPF Copilot nasceu da necessidade de criar um **Auditor Bidirecional**.

Desenhado e arquitetado por **Jefherson** com foco extremo em usabilidade (IHC) e precisão matemática, o projeto iniciou com testes de extração de notas da B3 (Day-Trade vs. Operação Comum) e escalou para um **Motor Omnívoro** capaz de ingerir desde PDFs estruturados de Declarações Anteriores até fotografias amassadas de recibos médicos.

A promessa do sistema é eliminar o *Context Switching*: em vez de abrir 5 planilhas e o site da Receita, o utilizador arrasta os seus documentos para um ambiente único (*Split-Screen*), e a IA orquestra o raciocínio legal em tempo real.

### 🛑 O Problema (A Fraqueza dos LLMs)

  * LLMs (Large Language Models) são motores probabilísticos; **eles falham em matemática determinística**.
  * RAGs (Retrieval-Augmented Generation) tradicionais sofrem de *Knowledge Leakage* (alucinação), onde a IA inventa deduções baseando-se em senso comum em vez da lei vigente.
  * Ferramentas de extração falham ao lidar com a formatação caótica das notas de corretagem (SINACOR) e as "Fichas da Declaração".

### ✨ A Solução (A Arquitetura MSLR)

  * **MSLR (Multi-Step Legal Reasoning):** Separação total de responsabilidades. A IA apenas *lê* e *extrai* intenções. O cálculo determinístico (ex: teto de dedução de R$ 3.561,50) é executado estritamente por funções TypeScript nativas (Tax Guards), garantindo 100% de segurança contra autuações.
  * **Motor Omnívoro (Visão):** Utilização do `gemini-2.5-flash` forçado em Modo JSON para atuar como OCR Nativo + Heurística de mercado, categorizando faturas, notas B3 e declarações antigas automaticamente.
  * **RAG Blindado:** Ingestão de leis via Supabase (pgvector) com scripts de higienização baseados em *Cheerio* para exterminar textos revogados e tachados do portal do Planalto.

-----

## 📸 Preview do Projeto (Cockpit Split-Screen)

*(Adicione suas screenshots reais do projeto aqui)*

\<img width="1920" height="1080" alt="Interface Split-Screen Monocromática" src="[https://via.placeholder.com/1920x1080.png?text=Dashboard+Split-Screen+(Chat+vs+Quadro+Branco](https://www.google.com/search?q=https://via.placeholder.com/1920x1080.png%3Ftext%3DDashboard%2BSplit-Screen%2B\(Chat%2Bvs%2BQuadro%2BBranco\))" /\>

-----

## 🚀 Funcionalidades e UI/UX Implementadas

  - [x] **Interface Stateful Whiteboard:** Layout Premium 40/60 (Esquerda: Chat RAG | Direita: Fila de Processamento Visual), seguindo os princípios de IHC de redução de carga cognitiva.
  - [x] **Fila de Upload Anti-Timeout:** Sistema estrito de laço assíncrono (`for...of`) que processa múltiplos PDFs em lote sem estourar o limite das Serverless Functions ou da cota da Google API.
  - [x] **Motor Omnívoro (Vision):** Capacidade de ingerir PDF ou Imagem e classificar automaticamente em `B3`, `SAUDE`, `EDUCACAO`, `DECLARACAO_ANTERIOR` ou `OUTROS`.
  - [x] **Streaming em Tempo Real (SSE):** Comunicação `Server-Sent Events` na rota de chat, gerando o efeito *typewriter* e renderizando o Markdown sem congelar o Event Loop do Next.js.
  - [x] **Animações GSAP:** Feedback visual instantâneo ("Auditoria em Real-Time") à medida que os nós financeiros são extraídos e renderizados na interface.

-----

## 📁 Arquitetura e Organização (Multi-Agent Modular)

A estrutura reflete a blindagem entre Raciocínio (LLM) e Determinismo (TypeScript):

```text
📦 irpf-copilot
 ┣ 📂 public
 ┣ 📂 src
 ┃ ┣ 📂 app
 ┃ ┃ ┣ 📂 api
 ┃ ┃ ┃ ┣ 📂 chat
 ┃ ┃ ┃ ┃ ┗ 📜 route.ts        # Cérebro 2: RAG, MSLR Interception e SSE Stream
 ┃ ┃ ┃ ┣ 📂 extract
 ┃ ┃ ┃ ┃ ┗ 📜 route.ts        # Cérebro 1: Motor Omnívoro de Visão (Gemini Flash)
 ┃ ┃ ┃ ┗ 📂 ingest
 ┃ ┃ ┃   ┗ 📜 route.ts        # Vetorização de Leis (pgvector)
 ┃ ┃ ┣ 📜 globals.css         # Tailwind v4
 ┃ ┃ ┣ 📜 layout.tsx
 ┃ ┃ ┗ 📜 page.tsx            # Ponto de entrada do Cockpit Split-Screen
 ┃ ┣ 📂 components
 ┃ ┃ ┣ 📜 ChatPanel.tsx       # Lado Esquerdo (UI RAG)
 ┃ ┃ ┣ 📜 DocumentUploader.tsx# Dropzone Multi-formato (Imagens/PDFs)
 ┃ ┃ ┗ 📜 FinancialWhiteboard.tsx # Lado Direito (GSAP Cards)
 ┃ ┣ 📂 hooks
 ┃ ┃ ┗ 📜 useChatStream.ts    # Fetch API nativa para ler pacotes Uint8Array do Llama
 ┃ ┣ 📂 lib
 ┃ ┃ ┣ 📂 constants
 ┃ ┃ ┃ ┗ 📜 tax_limits.ts     # Única fonte de verdade para números fiscais
 ┃ ┃ ┗ 📂 guards
 ┃ ┃   ┗ 📜 deduction_guard.ts# A "Alfândega" Matemática (Motor TypeScript)
 ┃ ┣ 📂 scripts
 ┃ ┃ ┗ 📜 sanitize_laws.ts    # Extrator Cheerio para purgar HTML tachado
 ┃ ┣ 📂 types
 ┃ ┃ ┗ 📜 finance.ts          # Zod Schemas Rigorosos e Tipagem Universal
 ┃ ┗ 📜 proxy.ts
 ┣ 📜 .env.example
 ┣ 📜 package.json
 ┣ 📜 postcss.config.mjs
 ┗ 📜 tsconfig.json
```

-----

## 🛠️ Tecnologias Utilizadas

  * **[Next.js 16.2 (App Router)](https://nextjs.org/)** - Framework React para orquestração Serverless e SSE nativo.
  * **[TypeScript](https://www.typescriptlang.org/)** & **[Zod](https://zod.dev/)** - Tipagem rigorosa para evitar que o LLM injete chaves malformadas no sistema.
  * **[Google Generative AI (Gemini 2.5 Flash)](https://ai.google.dev/)** - OCR Avançado e Classificador Multimodal via `json_object` estrito.
  * **[Groq (Llama-3.3-70b-versatile)](https://groq.com/)** - Motor de raciocínio jurídico de altíssima velocidade (LLPU).
  * **[Supabase (pgvector)](https://supabase.com/)** - Base de dados de vetores para a arquitetura de *Retrieval-Augmented Generation* (RAG).
  * **[Tailwind CSS v4](https://tailwindcss.com/)** & **[GSAP](https://gsap.com/)** - Design system Premium e animações de alta performance.

-----

## 🗺️ Roadmap (Próximos Passos)

  - [ ] **Simulação e-CAC:** Preparar o payload final de exportação compatível com a estrutura do programa PGD da Receita Federal.
  - [ ] **Expansão de Tax Guards:** Incluir verificadores matemáticos em C\# ou Rust isolados via WebAssembly para operações de mercado complexas (Cálculo de preço médio intertemporal de ações).
  - [ ] **Automação de Diário Oficial:** Integrar o Acer E1-571 rodando Node.js local como um *crawler* em background para buscar atualizações legislativas diárias e vetorizar no Supabase.

-----

## 💻 Como rodar localmente

Certifique-se de que tem o **Node.js** instalado e as suas chaves de API configuradas.

1.  **Clone este repositório:**

    ```bash
    git clone https://github.com/jefheee/irpf-copilot.git
    ```

2.  **Acesse a pasta do projeto:**

    ```bash
    cd irpf-copilot
    ```

3.  **Configure as Variáveis de Ambiente:**
    Renomeie o arquivo `.env.example` para `.env.local` e insira as suas chaves:

    ```env
    GOOGLE_API_KEY=sua_chave_gemini
    GROQ_API_KEY=sua_chave_groq
    NEXT_PUBLIC_SUPABASE_URL=seu_url_supabase
    NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_supabase
    ```

4.  **Instale as dependências:**

    ```bash
    npm install
    ```

5.  **Inicie o servidor de desenvolvimento:**

    ```bash
    npm run dev
    ```

-----

*Arquitetura e Design por [Jefherson Luiz](https://github.com/jefheee) | IA Powered.*
