# 🦁 IRPF Copilot 2026: Your Personal Assistant and Digital Vault

**IRPF Copilot 2026** is an intelligent application developed to end the anxiety and complexity when accounting to the "Lion" (Brazilian IRS). Operating under a Multi-Agent architecture, the system ingests raw documents (PDFs, photos of receipts, contracts) and generates an exact **Filing Plan** to be mirrored in the official Federal Revenue software.

---

## 🎯 The History and Purpose of the Project

This project was born from a personal and family pain. Every year, I found myself helping close people fill out their tax returns. The process was always chaotic: dozens of crumpled medical receipts, illegible vehicle purchase and sale contracts, and the constant doubt about *where* to put each piece of information in the government software.

The initial idea was simple: build a "Digital Vault" where the user throws in any document, and the AI tells them what to do. However, after deep market research and competitor analysis, I realized that common LLMs (Large Language Models) fail miserably at two things: **exact math** and **tax laws**.

To solve this and turn the tool into a true **Bidirectional Auditor**, the project scaled. I implemented a RAG (Retrieval-Augmented Generation) powered directly by the **official user manuals of the year's IRPF software** and current legislation, alongside an architecture that separates reasoning from mathematics.

### 🛑 The Problem (The Weakness of Traditional AIs)

* **Legal Hallucination (Knowledge Leakage):** Pure AIs invent deductions based on common sense, putting the user at risk of falling into the tax audit net (malha fina).
* **Probabilistic Calculations:** AIs fail basic math. A deduction ceiling cannot be "approximately" R$ 3,561.50.
* **Superficial Extraction:** Common tools only read a contract's title, ignoring the transaction amount, date, and involved CPFs (taxpayer IDs).

### ✨ The Solution (The Copilot Engine)

* **Specialized and Shielded RAG:** The knowledge base (Supabase/pgvector) is fed with the IRPF program manual and laws. We use *Cheerio* scripts to sanitize government texts, removing crossed-out or revoked paragraphs before vectorization.
* **Omnivorous Engine (Brain 1 - Vision):** Utilization of `gemini-2.5-flash` in strict JSON Mode. It ingests Previous Return Forms, medical receipts, and invoices, exhaustively mapping values into the `dados_financeiros_extensos` node. *(Note: The architecture has a predictive taxonomy for B3 brokerage notes, ready for future testing).*
* **MSLR (Multi-Step Legal Reasoning):** Brain 2 (Groq/Llama-3.3) only extracts intent. The mathematical validation (the law's "locks") occurs purely in TypeScript (`deduction_guard.ts`), returning the safe value for the AI to advise the user.

---

## 🔬 Research and Software Engineering (Standing on Shoulders of Giants)

The architecture of IRPF Copilot was not built on guesswork. We performed a *deep dive* into global Tax-Tech repositories and frameworks to extract the best engineering approaches:

* **Inspired by `QWED-Tax`:** We adopted the architectural pattern that fragments the transaction into dedicated engines, shielding the system against mathematical hallucinations (the origin of our MSLR).
* **Inspired by `Rag-Tax-Helper`:** We implemented *Query Rewriting* logic and government data sanitization to ensure that vector search (pgvector) only retrieves current law.
* **I/O Optimization (`Nota-de-corretagem-to-csv`):** Structuring the sending of dense binaries (PDFs/Images) by converting them natively to Base64 in Next.js memory, avoiding UI blocking.
* **Sessions and State (`AI-tax-agent` / `TaxEase.AI`):** Adoption of Server-Sent Events (SSE) to keep the session state fluid, replacing the old loading *spinners* model with a continuous data stream.

---

## 📸 Project Preview (Split-Screen Cockpit)

The design was projected with an absolute focus on HCI (Human-Computer Interaction). To eliminate cognitive fatigue (*Context Switching*), we adopted the split-screen: conversation on one side, data on the other.

---

## 🚀 Features and UI/UX Implemented

* [x] **Stateful Whiteboard (Split-Screen):** Clean monochromatic panel. Chat on the left (40%), Extracted Documents Board on the right (60%).
* [x] **Omnivorous Uploader with Backoff:** Support for PDF and Image *Drag & Drop*. Smart queueing system (`for...of`) with *throttling* (automatic pause) to bypass the `429 Too Many Requests` limit of the Gemini API Free Tier, without failing silently.
* [x] **Deep Financial Extraction:** The Zod Schema forces the AI to scan each document looking for `entidade_ou_ativo`, `valor_identificado`, and `natureza` (Acquisition, Alienation, Withheld Tax, etc.).
* [x] **Native Stream (SSE):** Brain 2 "types" the answer in real-time on the screen, respecting line breaks and Markdown formatting.
* [x] **Fluid Animations (GSAP):** With each new processed document, the operation "Cards" smoothly appear on the panel, conveying the feeling of a live audit happening.

---

## 📁 Modular Architecture

The structure reflects the shielding between Computer Vision, Reasoning (LLM), and Determinism (TypeScript):

```text
📦 irpf-copilot
 ┣ 📂 public
 ┣ 📂 src
 ┃ ┣ 📂 app
 ┃ ┃ ┣ 📂 api
 ┃ ┃ ┃ ┣ 📂 chat
 ┃ ┃ ┃ ┃ ┗ 📜 route.ts        # Brain 2: RAG, MSLR Interception and SSE Stream
 ┃ ┃ ┃ ┣ 📂 extract
 ┃ ┃ ┃ ┃ ┗ 📜 route.ts        # Brain 1: Omnivorous Engine (Gemini 2.5 Flash)
 ┃ ┃ ┃ ┗ 📂 ingest
 ┃ ┃ ┃   ┗ 📜 route.ts        # Ingestion of IRPF Laws and Manuals (pgvector)
 ┃ ┃ ┣ 📜 globals.css         # Tailwind v4
 ┃ ┃ ┣ 📜 layout.tsx
 ┃ ┃ ┗ 📜 page.tsx            # Cockpit entry point
 ┃ ┣ 📂 components
 ┃ ┃ ┣ 📜 ChatPanel.tsx       # Conversation UI
 ┃ ┃ ┣ 📜 DocumentUploader.tsx# Multi-format Upload Queue
 ┃ ┃ ┗ 📜 FinancialWhiteboard.tsx # Data Cards Renderer
 ┃ ┣ 📂 hooks
 ┃ ┃ ┗ 📜 useChatStream.ts    # Native Fetch API to read the stream (Uint8Array)
 ┃ ┣ 📂 lib
 ┃ ┃ ┣ 📂 constants
 ┃ ┃ ┃ ┗ 📜 tax_limits.ts     # Single source of truth for numbers (e.g., 3561.50)
 ┃ ┃ ┗ 📂 guards
 ┃ ┃   ┗ 📜 deduction_guard.ts# The Mathematical "Customs" (TS Engine)
 ┃ ┣ 📂 scripts
 ┃ ┃ ┗ 📜 sanitize_laws.ts    # Government HTML/DOM cleanup
 ┃ ┣ 📂 types
 ┃ ┃ ┗ 📜 finance.ts          # Zod UniversalDocumentSchema
 ┃ ┗ 📜 proxy.ts
 ┣ 📜 .env.local
 ┣ 📜 package.json
 ┗ 📜 tsconfig.json

```

---

## 🛠️ Technologies Used

* **[Next.js 16.2 (App Router)](https://nextjs.org/)** - Chosen for the ease of orchestrating Serverless Functions (for extraction APIs) and supporting native SSE for the chat.
* **[TypeScript](https://www.typescriptlang.org/)** & **[Zod](https://zod.dev/)** - The heart of reliability. Without strict typing and Schema validation, LLMs would inject corrupted data into the application.
* **[Google Generative AI (Gemini 2.5 Flash)](https://ai.google.dev/)** - Chosen for Brain 1 due to its high free RPM limit and native multimodal capability to force perfectly structured `json_object` responses.
* **[Groq (Llama-3.3-70b)](https://groq.com/)** - Brain 2. Used for its absurd inference speed (Tokens per second) to guide the user in real-time.
* **[Supabase (pgvector)](https://supabase.com/)** - PostgreSQL database with vector extension for ultra-fast semantic searches in the income tax booklets.
* **[Tailwind CSS v4](https://tailwindcss.com/) & [GSAP**](https://gsap.com/) - Clean styling, without heavy configuration files, and professional animations.

---

## 🗺️ Roadmap (Next Steps)

* [ ] **Real B3 Integration:** Test and validate the taxonomy of Day-Trade vs. Common Operation with real SINACOR notes as soon as the data is available.
* [ ] **Absolute Privacy (On-Device):** Study the feasibility of packaging the software (Tauri/Electron) and running local LLMs via WebGPU or Ollama on the user's PC, ensuring that no PDF containing a CPF leaves the local machine (100% Privacy).
* [ ] **Funding Capture:** Structure the project with solid metrics for submission to state grant and innovation public notices (e.g., Fapesc).
* [ ] **e-CAC Payload Generation:** Make the AI, besides advising, generate a file or script compatible with direct importation into the Federal Revenue's PGD program.

---

## 💻 How to run locally

1. **Clone this repository:**
```bash
git clone https://github.com/jefheee/irpf-copilot.git

```


2. **Access the folder:**
```bash
cd irpf-copilot

```


3. **Configure Environment Variables:**
Rename `.env.example` to `.env.local` and insert your keys (Google AI Studio, Groq, Supabase).
```
GOOGLE_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

```


4. **Install dependencies:**
```bash
npm install

```


5. **Start the development environment:**
```bash
npm run dev

```



---

*Architecture and Design by [Jefherson Luiz](https://github.com/jefheee) | AI Powered.*
