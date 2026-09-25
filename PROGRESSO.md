# Progresso — 25/09/2026

## Correções implementadas

- Cadastro local bloqueia CPF repetido na criação e edição; normaliza telefone e CPF.
- Nova hospedagem pede a escolha do responsável; Nova reserva começa como reservada.
- Calendário abre uma reserva com quarto e período selecionados.
- Serviço valida datas, capacidade, condição operacional, referências e conflitos, inclusive em atualização parcial.
- Acompanhantes são persistidos; checkout encerra a hospedagem e envia o quarto para limpeza na mesma gravação.
- Indicador de disponibilidade desconta ocupação; quartos mostram hóspede e saída.
- Telas consultam novamente após gravações e alterações em outra aba do mesmo navegador.
- Falhas de armazenamento são propagadas, sem mensagem falsa de sucesso; conteúdo local corrompido não é substituído por demonstração.
- Backup local contém configuração, hóspedes, quartos, hospedagens, pagamentos, auditoria, histórico de importação e sequência de códigos.
- Restauração valida referências, exige confirmação na interface e preserva o estado anterior na chave `pousada_hospedes_v2_store_before_restore`.
- Importação aditiva é separada da restauração. JSON antigo converte nomes/campos e quartos. Planilhas mantêm múltiplas visitas vinculadas ao mesmo CPF. Sem data de saída no original, usa o dia seguinte, com observação explícita para revisão.

## Supabase: código preparado, validação real pendente

O aplicativo agora usa o Supabase para hóspedes, hospedagens, acompanhantes, quartos, pagamentos, auditoria e exportação quando há configuração. Erros não fazem fallback para o armazenamento local. Login exige um perfil ativo. O serviço bloqueia escrita para o papel consulta; as regras definitivas ficam no banco.

Aplicar em ordem, em um projeto de teste:

1. `supabase/migrations/20260924000000_initial_schema.sql`
2. `supabase/migrations/20260925000000_operational_integrity.sql`

A segunda migração adiciona unicidade de CPF por pousada, exclusão de períodos sobrepostos (inclusive concorrentes), políticas por pousada/papel, validações operacionais, auditoria e RPC transacional de hospedagem/acompanhantes/checkout. Se houver CPFs duplicados ou reservas sobrepostas existentes, a transação falhará sem apagar os registros: revisar esses registros antes de aplicar.

Criar a pousada e o primeiro usuário pelo painel administrativo do Supabase e vincular `user_profiles.id` ao ID do usuário de Authentication, com `pousada_id` correspondente e `active=true`. Não existe tela de provisionamento de usuários. Preencher `.env` a partir de `.env.example`, usando somente URL e chave pública do cliente. Nunca colocar chave service-role no frontend.

Não foi aplicada migração remota e não foi executado teste com PostgreSQL real nesta etapa. Importação/restauração por arquivo no Supabase ainda não está implementada; a interface informa a limitação e não grava localmente por engano. A exportação inclui os dados operacionais, mas não substitui backup administrativo de Authentication, políticas e infraestrutura do Supabase.

## Verificação

`node --test tests/reliability.test.cjs` executa sete testes de regressão, com dados fictícios e armazenamento isolado em memória. Abrange duplicidade, capacidade, manutenção, limpeza, datas, conflitos, atualização parcial, ciclo de recepção, acompanhantes, pagamentos, restauração, importação antiga, quota/corrupção e ausência de fallback remoto.

`node node_modules/typescript/bin/tsc --noEmit`

`node node_modules/vite/bin/vite.js build`

Teste manual no navegador: painel inicial, Nova reserva sem hóspede pré-selecionado, situação reservada e quarto em manutenção desabilitado. Os testes de serviço não substituem validação de login/RLS/concorrência em Supabase real.

## Ainda pendente

- Aplicar e validar banco, autenticação, permissões e concorrência com contas de teste.
- Importação/restauração transacional na nuvem.
- Gestão editável de configurações/usuários, revisão de duplicidades antigas e cadastros auxiliares.
- Relatórios completos, sincronização em tempo real entre dispositivos e PWA/offline.
- Revisão visual ampla em desktop/celular e testes de todos os fluxos pela interface.

O código anterior foi preservado em `.revisions/before-reliability-fixes.zip`. Os testes não modificam os cadastros de uso do navegador.
