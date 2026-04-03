# Configuração de Segurança Supabase (RLS)

Execute o seguinte código SQL no Editor SQL do seu projeto Supabase para garantir a imutabilidade do RAG por terceiros e proteger a base de dados:

```sql
ALTER TABLE public.irpf_manual ENABLE ROW LEVEL SECURITY;
-- Permite leitura pública (RAG)
CREATE POLICY "Leitura anonima" ON public.irpf_manual FOR SELECT TO anon USING (true);
-- Permite inserção/atualização apenas pelo Service Role (Backend)
CREATE POLICY "Escrita admin" ON public.irpf_manual FOR ALL TO service_role USING (true);
```
