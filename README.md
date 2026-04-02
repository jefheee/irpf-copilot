# 🦁 IRPF Copilot 2026: O seu Assistente Pessoal e Cofre Digital

O **IRPF Copilot 2026** é uma aplicação inteligente desenvolvida para acabar com a ansiedade e a complexidade na hora de prestar contas ao Leão. Operando sob uma arquitetura Multi-Agente, o sistema ingere documentos brutos (PDFs, fotos de recibos, contratos) e gera um **Plano de Preenchimento** exato para ser espelhado no software oficial da Receita Federal.

-----

## 🎯 A História e o Propósito do Projeto

Este projeto nasceu de uma dor pessoal e familiar. Todo ano, eu me via ajudando pessoas próximas a preencherem suas declarações. O processo era sempre caótico: dezenas de recibos médicos amassados, contratos de compra e venda de veículos ilegíveis e a dúvida constante sobre *onde* colocar cada informação no software do governo.

A ideia inicial era simples: construir um "Cofre Digital" onde o usuário joga qualquer documento, e a IA diz o que fazer. No entanto, após uma pesquisa profunda de mercado e análise de concorrentes, percebi que os LLMs (Large Language Models) comuns falham miseravelmente em duas coisas: **matemática exata** e **leis tributárias**.

Para resolver isso e transformar a ferramenta em um verdadeiro **Auditor Bidirecional**, o projeto escalou. Implementei um RAG (Retrieval-Augmented Generation) alimentado diretamente pelos **manuais de uso oficiais do software do IRPF do ano** e legislações vigentes, além de uma arquitetura que separa o raciocínio da matemática.

### 🛑 O Problema (A Fraqueza das IAs Tradicionais)

  * **Alucinação Jurídica (Knowledge Leakage):** IAs puras inventam deduções baseadas em senso comum, colocando o usuário em risco de malha fina.
  * **Cálculos Probabilísticos:** IAs erram contas básicas. Um teto de dedução não pode ser "aproximadamente" R$ 3.561,50.
  * **Extração Superficial:** Ferramentas comuns leem apenas o título de um contrato, ignorando o valor da transação, a data e os CPFs envolvidos.

### ✨ A Solução (O Motor Copilot)

  * **RAG Especializado e Blindado:** A base de conhecimento (Supabase/pgvector) é alimentada com o manual do programa do IRPF e leis. Usamos scripts em *Cheerio* para higienizar textos governamentais, removendo parágrafos tachados ou revogados antes da vetorização.
  * **Motor Omnívoro (Cérebro 1 - Visão):** Utilização do `gemini-2.5-flash` em Modo JSON estrito. Ele ingere Fichas de Declarações Anteriores, recibos médicos e faturas, mapeando exaustivamente valores no nó `dados_financeiros_extensos`. *(Nota: A arquitetura possui taxonomia preditiva para notas de corretagem da B3, prontas para testes futuros).*
  * **MSLR (Multi-Step Legal Reasoning):** O Cérebro 2 (Groq/Llama-3.3) apenas extrai a intenção. A validação matemática (as "travas" da lei) ocorre puramente no TypeScript (`deduction_guard.ts`), devolvendo à IA o valor seguro para aconselhar o usuário.

-----

## 🔬 Pesquisa e Engenharia de Software (Standing on Shoulders of Giants)

A arquitetura do IRPF Copilot não foi construída baseada em achismos. Realizamos um *deep dive* em repositórios e *frameworks* globais de Tax-Tech para extrair as melhores abordagens de engenharia:

  * **Inspirado pelo `QWED-Tax`:** Adotamos o padrão arquitetural que fragmenta a transação em motores dedicados, blindando o sistema contra alucinações matemáticas (a origem do nosso MSLR).
  * **Inspirado pelo `Rag-Tax-Helper`:** Implementamos a lógica de *Query Rewriting* e sanitização de dados governamentais para garantir que a busca vetorial (pgvector) traga apenas a lei vigente.
  * **Otimização de I/O (`Nota-de-corretagem-to-csv`):** Estruturação do envio de binários densos (PDFs/Imagens) convertendo-os nativamente para Base64 na memória do Next.js, evitando o bloqueio da interface do usuário.
  * **Sessões e Estado (`AI-tax-agent` / `TaxEase.AI`):** Adoção de Server-Sent Events (SSE) para manter o estado da sessão fluido, trocando o modelo antigo de *spinners* de carregamento por um fluxo contínuo de dados.

-----

## 📸 Preview do Projeto (Cockpit Split-Screen)

*(Adicione suas screenshots reais do projeto aqui)*

O design foi projetado com foco absoluto em IHC (Interação Humano-Computador). Para eliminar a fadiga cognitiva (*Context Switching*), adotamos a tela dividida: de um lado a conversa, do outro os dados.

\<img width="1920" height="1080" alt="Interface Split-Screen Monocromática" src="[https://github.com/user-attachments/assets/exemplo-dashboard.png](https://www.google.com/search?q=https://github.com/user-attachments/assets/exemplo-dashboard.png)" /\>

-----

## 🚀 Funcionalidades e UI/UX Implementadas

  - [x] **Stateful Whiteboard (Split-Screen):** Painel monocromático limpo. Chat à esquerda (40%), Quadro de Documentos Extraídos à direita (60%).
  - [x] **Uploader Omnívoro com Backoff:** Suporte a *Drag & Drop* de PDFs e Imagens. Sistema de fila (`for...of`) inteligente com *throttling* (pausa automática) para contornar o limite de `429 Too Many Requests` do Free Tier da API do Gemini, sem falhar silenciosamente.
  - [x] **Extração Financeira Profunda:** O Zod Schema obriga a IA a varrer cada documento buscando `entidade_ou_ativo`, `valor_identificado`, e `natureza` (Aquisição, Alienação, Imposto Retido, etc.).
  - [x] **Stream Nativo (SSE):** O Cérebro 2 "digita" a resposta em tempo real na tela, respeitando quebras de linha e formatação Markdown.
  - [x] **Animações Fluidas (GSAP):** A cada novo documento processado, os "Cards" de operações surgem no painel com suavidade, transmitindo a sensação de uma auditoria acontecendo ao vivo.

-----

## 📁 Arquitetura Modular

A estrutura reflete a blindagem entre Visão Computacional, Raciocínio (LLM) e Determinismo (TypeScript):

```text
📦 irpf-copilot
 ┣ 📂 public
 ┣ 📂 src
 ┃ ┣ 📂 app
 ┃ ┃ ┣ 📂 api
 ┃ ┃ ┃ ┣ 📂 chat
 ┃ ┃ ┃ ┃ ┗ 📜 route.ts        # Cérebro 2: RAG, MSLR Interception e SSE Stream
 ┃ ┃ ┃ ┣ 📂 extract
 ┃ ┃ ┃ ┃ ┗ 📜 route.ts        # Cérebro 1: Motor Omnívoro (Gemini 2.5 Flash)
 ┃ ┃ ┃ ┗ 📂 ingest
 ┃ ┃ ┃   ┗ 📜 route.ts        # Ingestão de Leis e Manuais do IRPF (pgvector)
 ┃ ┃ ┣ 📜 globals.css         # Tailwind v4
 ┃ ┃ ┣ 📜 layout.tsx
 ┃ ┃ ┗ 📜 page.tsx            # Ponto de entrada do Cockpit
 ┃ ┣ 📂 components
 ┃ ┃ ┣ 📜 ChatPanel.tsx       # UI de Conversa
 ┃ ┃ ┣ 📜 DocumentUploader.tsx# Fila de Uploads Multi-formato
 ┃ ┃ ┗ 📜 FinancialWhiteboard.tsx # Renderizador de Cards de Dados
 ┃ ┣ 📂 hooks
 ┃ ┃ ┗ 📜 useChatStream.ts    # Fetch API nativa para ler o stream (Uint8Array)
 ┃ ┣ 📂 lib
 ┃ ┃ ┣ 📂 constants
 ┃ ┃ ┃ ┗ 📜 tax_limits.ts     # Única fonte de verdade para números (ex: 3561.50)
 ┃ ┃ ┗ 📂 guards
 ┃ ┃   ┗ 📜 deduction_guard.ts# A "Alfândega" Matemática (Motor TS)
 ┃ ┣ 📂 scripts
 ┃ ┃ ┗ 📜 sanitize_laws.ts    # Limpeza de HTML/DOM governamental
 ┃ ┣ 📂 types
 ┃ ┃ ┗ 📜 finance.ts          # Zod UniversalDocumentSchema
 ┃ ┗ 📜 proxy.ts
 ┣ 📜 .env.local
 ┣ 📜 package.json
 ┗ 📜 tsconfig.json
```

-----

## 🛠️ Tecnologias Utilizadas

  * **[Next.js 16.2 (App Router)](https://nextjs.org/)** - Escolhido pela facilidade em orquestrar Serverless Functions (para as APIs de extração) e suportar SSE nativo para o chat.
  * **[TypeScript](https://www.typescriptlang.org/)** & **[Zod](https://zod.dev/)** - O coração da confiabilidade. Sem tipagem estrita e validação de Schema, os LLMs injetariam dados corrompidos na aplicação.
  * **[Google Generative AI (Gemini 2.5 Flash)](https://ai.google.dev/)** - Escolhido para o Cérebro 1 por possuir alto limite de RPM gratuito e capacidade multimodal nativa de forçar respostas em `json_object` perfeitamente estruturadas.
  * **[Groq (Llama-3.3-70b)](https://groq.com/)** - O Cérebro 2. Utilizado pela velocidade absurda de inferência (Tokens por segundo) para guiar o usuário em tempo real.
  * **[Supabase (pgvector)](https://supabase.com/)** - Banco de dados PostgreSQL com extensão vetorial para buscas semânticas ultrarrápidas nas cartilhas do imposto de renda.
  * **[Tailwind CSS v4](https://tailwindcss.com/) & [GSAP](https://gsap.com/)** - Estilização limpa, sem arquivos de configuração pesados, e animações profissionais.

-----

## 🗺️ Roadmap (Próximos Passos)

  - [ ] **Integração Real B3:** Testar e validar a taxonomia de Day-Trade vs. Operação Comum com notas SINACOR reais assim que os dados estiverem disponíveis.
  - [ ] **Privacidade Absoluta (On-Device):** Estudar a viabilidade de empacotar o software (Tauri/Electron) e rodar LLMs locais via WebGPU ou Ollama no PC do usuário, garantindo que nenhum PDF contendo CPF saia da máquina local (100% Privacy).
  - [ ] **Captação de Fomento:** Estruturar o projeto com métricas sólidas para submissão a editais estaduais de subvenção e inovação (ex: Fapesc).
  - [ ] **Geração de Payload e-CAC:** Fazer com que a IA, além de aconselhar, gere um arquivo ou script compatível com a importação direta do programa PGD da Receita Federal.

-----

## 💻 Como rodar localmente

1.  **Clone este repositório:**

    ```bash
    git clone https://github.com/jefheee/irpf-copilot.git
    ```

2.  **Acesse a pasta:**

    ```bash
    cd irpf-copilot
    ```

3.  **Configure as Variáveis de Ambiente:**
    Renomeie `.env.example` para `.env.local` e insira suas chaves (Google AI Studio, Groq, Supabase).

4.  **Instale as dependências:**

    ```bash
    npm install
    ```

5.  **Inicie o ambiente de desenvolvimento:**

    ```bash
    npm run dev
    ```

-----

*Arquitetura e Design por [Jefherson Luiz](https://github.com/jefheee) | IA Powered.*
