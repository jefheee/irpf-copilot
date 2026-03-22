---
trigger: always_on
---

- Next.js 16+ (App Router, Turbopack). Use Server Components por padrão; use `'use client'` apenas onde houver estado/interatividade.
- Tailwind CSS v4. NUNCA procure ou crie o ficheiro `tailwind.config.js` ou `tailwind.config.ts`. Todas as variáveis de tema, plugins (como o @tailwindcss/typography) e animações estão centralizadas no `src/app/globals.css`.
- GSAP para animações e transições.