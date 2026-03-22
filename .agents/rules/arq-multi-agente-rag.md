---
trigger: always_on
---

- Cérebro 1 (Extração): `src/app/api/extract/route.ts` usa Gemini 3. Retorna ESTRITAMENTE JSON.
- Cérebro 2 (Chat): `src/app/api/chat/route.ts` usa Groq (llama-3.3-70b-versatile).
- NUNCA altere estas duas rotas sem ordem explícita.
- Privacidade: Zero Data Retention. Não guarde os PDFs do utilizador no disco.