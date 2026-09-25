# Ativar importação Excel no Supabase

A versão anterior desativava o seletor quando o Supabase estava configurado e o serviço de importação só gravava no navegador. Esta alteração libera Excel/CSV para perfis ativos de administrador e recepção e envia os registros ao banco via `import_guest_batch`.

## Ativação

1. As migrações `20260924000000_initial_schema.sql` e `20260925000000_operational_integrity.sql` devem estar aplicadas. Não execute novamente a migração inicial em um banco já criado. Confira o histórico das migrações; a migração operacional exige revisão prévia se houver CPFs duplicados ou reservas sobrepostas.
2. Aplique `supabase/migrations/20260925170000_excel_import.sql` pelo SQL Editor do projeto Supabase correto (ou pelo fluxo de migrações da equipe). Ela acrescenta uma função e um índice; não apaga dados.
3. Publique o frontend desta alteração. A publicação do Netlify não executa SQL no Supabase.
4. Entre no site com perfil ativo `admin` ou `recepcao`. Abra Dados → Importar Dados, selecione a planilha original e confira a aba escolhida.
5. Confira os clientes, avisos e quartos. Para cada nome do Excel, é possível selecionar um quarto existente. A opção de criar nova acomodação aparece explicitamente quando não há correspondência pelo nome.
6. Marque a conferência e confirme a importação. Consulte o histórico para rever o lote e seus dados originais.

O arquivo não é armazenado como objeto no Supabase Storage. Seus dados são lidos no navegador e gravados em guests, stays, stay_guests, rooms e import_history. Valor combinado não cria pagamento recebido.

## Formatos e revisão

Aceita os cabeçalhos da planilha consolidada original (Nome, CPF / documento, Telefone, Endereço, Número, Complemento, Bairro, Cidade / origem informada, Estado, CEP, Contato de emergência, Acompanhantes, Quarto / unidade, Valor informado, Entrada, Saída, Observações, Arquivo de origem, Linha de origem) e os aliases já existentes no app. O usuário escolhe uma aba; abas auxiliares não são importadas automaticamente. Quando a planilha contém ORIGINAL, ela é selecionada inicialmente para preservar campos omitidos da antiga aba IMPORTAR.

Documentos de tamanho diferente de 11 dígitos são preservados como documento alternativo. Contato de emergência e dados originais ficam nas observações da ficha e no histórico de importação. Acompanhantes com nomes separados por vírgula ou ponto e vírgula, com documento entre parênteses, são vinculados à hospedagem válida.

Sem situação explícita, hospedagens são históricas/finalizadas. Sem saída, estima-se o dia seguinte e exibe-se aviso. Datas sem ano, intervalos invertidos, múltiplos quartos numa célula ou valores ambíguos não geram hospedagem: o cliente é preservado, com registro original e aviso. Corrija o Excel e importe novamente quando esses dados forem esclarecidos. Não há associação automática de pessoas sem CPF entre arquivos diferentes; confira essas fichas para evitar duplicação.

Uma transação salva o lote inteiro ou desfaz tudo se algum registro falhar. O hash dos dados evita repetir o mesmo lote. CPF reutiliza cadastro existente sem sobrescrever a ficha; hóspedes sem CPF não são unidos só pelo nome. Hospedagens já existentes para o mesmo cliente, quarto e intervalo são ignoradas. Registros originais permanecem no histórico, inclusive quando um CPF já existe. Alterar um lote já importado não atualiza silenciosamente a hospedagem anterior: edite registros existentes no aplicativo quando necessário.

Backups JSON completos continuam restauráveis somente no modo local. No Supabase, exportação de backup continua disponível, sem oferecer restauração destrutiva pela interface.

## Verificação realizada

- `npm test`: testes de duplicação de CPF, reservas e conflitos, capacidade, acompanhantes, pagamentos, checkout, backup, erro de armazenamento, roteamento cloud, importação original, dados ambíguos, repetição de lote, configurações/tipos, seletor Excel por perfil e fuso Bahia.
- `npm run build`: compilação TypeScript e build Vite.
- Migrações executadas em PostgreSQL via PGlite, com extensões oficiais uuid-ossp, unaccent e btree_gist: importação, acompanhantes, repetição do lote, rollback em erro de data e bloqueio do perfil consulta.
- Planilha real processada localmente: 102 clientes, 84 hospedagens elegíveis, 46 avisos. Dados pessoais usados apenas no ambiente de teste; não incluídos no repositório.
- Testes interativos da versão local no navegador não concluídos: acesso a localhost bloqueado pelo ambiente. Nenhuma gravação de teste feita no banco de produção.

## Outros ajustes

Configurações agora carregam dados reais e permitem gravação por administrador. Horários padrão são usados no formulário de nova reserva. Tipos de acomodação podem ser cadastrados/editados e selecionados nos quartos. A tela de duplicidades lista candidatos por nome para revisão. Exportação Excel inclui endereço, valores e acompanhantes, além de pagamentos em aba própria. Datas UTC retornadas pelo Supabase são exibidas no calendário operacional da Bahia. Cache da PWA consulta o HTML na rede e remove o cache antigo ao atualizar.
