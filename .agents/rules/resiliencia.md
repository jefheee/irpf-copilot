---
trigger: always_on
---

- Não confie no JSON.parse() direto de LLMs. Use blindagem Regex `[\x00-\x1F]+` para remover quebras de linha literais.