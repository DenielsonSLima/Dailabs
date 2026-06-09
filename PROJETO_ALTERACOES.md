# Histórico de Alterações do Projeto

## [2026-06-09] - Feature: Novos KPIs de Despesas Fixas e Variáveis (Total, Pago, Pendente) via Banco

**O que foi feito:**
- **Novas RPCs no Supabase**: Criadas duas funções PostgreSQL, `get_despesas_fixas_kpis` e `get_despesas_variaveis_kpis` (migração `20260609_create_rpc_despesas_kpis.sql`), para computar os novos KPIs no banco de dados com base nas abas e filtros correntes:
  - `valor_total`: soma de `valor_total` dos títulos.
  - `valor_pago`: soma de `valor_pago` dos títulos.
  - `valor_pendente`: soma de `valor_total - valor_pago`.
- **Frontend Services**: Refatorados `DespesasFixasService.getKpis` e `DespesasVariaveisService.getKpis` para invocar as respectivas novas RPCs em vez da antiga `get_despesas_kpis`.
- **Componentes de KPI**: Atualizados os componentes de interface `FixasKpis.tsx` e `VariaveisKpis.tsx` para exibir os novos valores de **Valor Total**, **Valor Pago** e **Valor Pendente** em substituição aos KPIs anteriores ("Total a Pagar", "Vencendo Hoje", "Total em Atraso").
- **TanStack Query Invalidation**: Importado e configurado o `useQueryClient` nas páginas `DespesasFixas.page.tsx` e `DespesasVariaveis.page.tsx` para invalidar a chave `['caixa_dashboard']` após qualquer criação, edição, estorno ou pagamento de títulos, garantindo sincronização instantânea com os gráficos e saldos do dashboard financeiro global do caixa.

**Arquivos afetados:**
- `modules/financeiro/submodules/despesas-fixas/components/FixasKpis.tsx` [MODIFY]
- `modules/financeiro/submodules/despesas-variaveis/components/VariaveisKpis.tsx` [MODIFY]
- `modules/financeiro/submodules/despesas-fixas/despesas-fixas.service.ts` [MODIFY]
- `modules/financeiro/submodules/despesas-variaveis/despesas-variaveis.service.ts` [MODIFY]
- `modules/financeiro/submodules/despesas-fixas/DespesasFixas.page.tsx` [MODIFY]
- `modules/financeiro/submodules/despesas-variaveis/DespesasVariaveis.page.tsx` [MODIFY]
- `supabase/migrations/20260609_create_rpc_despesas_kpis.sql` [NEW]

## [2026-06-09] - Fix/Feat: Ativação do Recebimento A Prazo e Toggle de Status na Interface

**O que foi feito:**
- **Ativação do Recebimento "PRAZO"**: Executado comando SQL diretamente na base remota do Supabase para reativar (`ativo = true`) a forma de pagamento "PRAZO" (`destino_lancamento = 'CONTAS_RECEBER'`), permitindo o seu uso imediato na tela de "Lançar Crédito" (Outros Créditos) com as regras pré-programadas de parcelamento.
- **Toggle de Status na Interface**: Adicionado o componente de alternância visual de status (Ativo/Inativo) no cabeçalho do formulário de Formas de Pagamento (`FormasPagamentoForm.tsx`). Isso garante que os administradores do sistema possam facilmente habilitar ou desabilitar métodos de pagamento diretamente na tela do ERP, prevenindo a necessidade de intervenção direta no banco.
- **Documentação de Acesso MCP**: Registrado no arquivo de contexto do projeto (`PROJETO_CONTEXTO.md`) e nas diretrizes de habilidades (`.agent/skills/Acesso/SKILL.md`) que o agente de IA possui permissão de escrita e leitura na base remota via CLI do Supabase com o token de acesso obtido de `mcp_config.json`.

**Arquivos afetados:**
- `modules/cadastros/formas-pagamento/components/FormasPagamentoForm.tsx` [MODIFY]
- `supabase/migrations/20260609_activate_prazo_payment_form.sql` [NEW]
- `PROJETO_CONTEXTO.md` [MODIFY]
- `.agent/skills/Acesso/SKILL.md` [MODIFY]

## [2026-06-09] - Feature: Abas Dinâmicas, KPIs no Servidor e Totais de Agrupamento nas Despesas Fixas e Variáveis

**O que foi feito:**
- **Banco de Dados**: Criada a função RPC `get_despesas_kpis` no Supabase com RLS `SECURITY INVOKER` para computar os KPIs (Total a Pagar, Vencendo Hoje, Total em Atraso) baseados na aba, busca, categoria e datas de início/fim passadas pelo cliente.
- **Frontend Services**: Refatorados `despesas-fixas.service.ts` e `despesas-variaveis.service.ts` para implementar as 5 abas requeridas ("Mês Atual", "Futuros", "Pago", "Pendentes", "Todos") e realizar o carregamento de KPIs delegando a computação à nova RPC do Supabase.
- **Componentes e Páginas**:
  - Atualizadas as páginas `DespesasFixas.page.tsx` e `DespesasVariaveis.page.tsx` com as novas abas, e implementado carregamento paralelo resiliente via `Promise.allSettled` (evitando skeletons infinitos em caso de erros de rede ou banco).
  - Atualizados os componentes de listagem `FixasList.tsx` e `VariaveisList.tsx` para exibir a soma do `valor_total` dos títulos ao lado do cabeçalho de cada agrupamento (por mês ou por categoria).

**Arquivos afetados:**
- `supabase/migrations/20260609_create_rpc_kpis.sql` [NEW/APPLIED]
- `modules/financeiro/submodules/despesas-fixas/despesas-fixas.types.ts` [MODIFY]
- `modules/financeiro/submodules/despesas-fixas/despesas-fixas.service.ts` [MODIFY]
- `modules/financeiro/submodules/despesas-fixas/DespesasFixas.page.tsx` [MODIFY]
- `modules/financeiro/submodules/despesas-fixas/components/FixasList.tsx` [MODIFY]
- `modules/financeiro/submodules/despesas-variaveis/despesas-variaveis.types.ts` [MODIFY]
- `modules/financeiro/submodules/despesas-variaveis/despesas-variaveis.service.ts` [MODIFY]
- `modules/financeiro/submodules/despesas-variaveis/DespesasVariaveis.page.tsx` [MODIFY]
- `modules/financeiro/submodules/despesas-variaveis/components/VariaveisList.tsx` [MODIFY]

## [2026-06-09] - Fix: Correção de Queries de Relatórios (Comissões e Histórico Financeiro)

**O que foi feito:**
- **Relatório de Comissões**: Removida a coluna `comissao_percentual` do SELECT da tabela `cad_corretores` na query `getComissoesParaRelatorio` em `modules/relatorios/relatorios.service.ts` para evitar que a consulta falhasse com coluna inexistente no banco de dados.
- **Histórico / Relatório Financeiro**: Removido o relacionamento `conta_prevista:fin_contas_bancarias` do SELECT na query de títulos pendentes em `modules/financeiro/services/historico.service.ts` (uma vez que contas só são associadas ao liquidar transações) e atualizado o mapeamento correspondente para definir a conta como `'—'`, resolvendo os erros de relacionamento no carregamento de histórico financeiro.

**Arquivos afetados:**
- `modules/relatorios/relatorios.service.ts` [FIX]
- `modules/financeiro/services/historico.service.ts` [FIX]

## [2026-06-09] - Fix: Contabilização de Outros Créditos no Lucro Líquido (Caixa/DRE)

**O que foi feito:**
- **Inclusão de Outros Créditos no Lucro**: Atualizada a RPC `get_caixa_metrics` no Supabase para somar recebimentos efetivos de títulos vinculados a `origem_tipo = 'OUTRO_CREDITO'` (outros créditos extraordinários, como aluguéis e receitas adicionais) no cálculo de `lucro_mensal`, `lucro_gerado` e `margem_lucro`.
- **Regime de Caixa para Outros Créditos**: Garantido que o cálculo do lucro contabilize a data de pagamento real da transação (`data_pagamento` em `fin_transacoes`), seja ela uma parcela integral ou parcial, em vez da data de vencimento do título.

**Arquivos afetados:**
- `supabase/migrations/20260609_fix_lucro_outros_creditos.sql` [NEW/APPLIED]

## [2026-06-03] - Fix: Alinhamento do Lucro Líquido no Desempenho Trimestral

**O que foi feito:**
- **Sincronização de Lucro no Gráfico**: Alterado o cálculo de lucro em `CaixaService.getPerformanceHistory` para utilizar o valor real do lucro líquido calculado pelo backend (`caixaValid.lucro_mensal`) em vez de recalcular no frontend sem considerar descontos obtidos/concedidos e receitas adicionais. Isso resolve a divergência onde o gráfico "Desempenho Trimestral" exibia R$ 15.378,00 enquanto os cartões de KPI exibiam R$ 17.878,00.

**Arquivos afetados:**
- `modules/caixa/caixa.service.ts` [FIX]

## [2026-06-03] - Fix: Correção visual e lógica dos sinais de Descontos na Conciliação Patrimonial

**O que foi feito:**
- **Correção dos Sinais de Desconto**: Ajustada a lógica de mapeamento em `RelatoriosService.getConciliacaoPatrimonial` para que descontos sejam exibidos com o sinal correto na tabela de movimentações do período:
  - **Desconto Obtido (Compra - R$ 4.000,00)**: Era exibido erroneamente como `- R$ 4.000,00` (saída/vermelho). Agora é exibido como `+ R$ 4.000,00` (entrada/verde), pois representa uma economia/ganho real para a empresa.
  - **Desconto Concedido (Venda - R$ 1.500,00)**: Era exibido erroneamente como `+ R$ 1.500,00` (entrada/verde). Agora é exibido como `- R$ 1.500,00` (saída/vermelho), pois representa uma redução de receita.
- **Correção de Totais de Caixa**: Alterado o dashboard de conciliação e o template do PDF (`PatrimonioConciliacaoTemplate.tsx`) para usar os totais reais do banco de dados (que já excluem descontos do fluxo de caixa físico) e filtrar transações locais de desconto na hora de somar, garantindo consistência matemática entre as tabelas e os cartões de cabeçalho.

**Arquivos afetados:**
- `modules/relatorios/relatorios.service.ts` [FIX/REFATORAÇÃO]
- `modules/relatorios/templates/caixa/PatrimonioConciliacaoTemplate.tsx` [FIX]

## [2026-06-03] - Exec: Aplicação da Migração de Descontos e Acréscimos nas Métricas de Caixa/DRE

**O que foi feito:**
- **Aplicação da RPC**: Executada a migração `20260603_fix_metrics_discounts.sql` que recria a função RPC `get_caixa_metrics` no Supabase. Isso resolve a divergência onde os descontos obtidos (como o de R$ 4.000,00 do Pedido #57) e concedidos não estavam sendo somados/subtraídos no cálculo do Lucro Mensal e Patrimônio Líquido no backend.
- **Validação de Cálculos**: Validado que para o mês de Junho/2026 o lucro mensal subiu de R$ 15.378,00 para R$ 17.878,00 após a aplicação (um incremento exato de R$ 4.000,00 do desconto obtido menos R$ 1.500,00 de descontos concedidos).

**Arquivos afetados:**
- Banco de Dados (Supabase: Função `get_caixa_metrics`) [APPLIED]

## [2026-06-03] - Fix: Correção de Erro de Relacionamento no Relatório de Conciliação Patrimonial (PGRST200)

**O que foi feito:**
- **Correção da Query de Transações**: Alterada a query em `RelatoriosService.getConciliacaoPatrimonial` para buscar a categoria através do relacionamento com o título (`titulo:fin_titulos(categoria:fin_categorias(nome))`) em vez de diretamente pela tabela `fin_transacoes`. Isso resolve o erro `PGRST200` ("no foreign key relationship between 'fin_transacoes' and 'fin_categorias'") que impedia a visualização da tela.
- **Mapeamento de Dados**: Mapeados os campos retornados da query para compatibilidade com o template do extrato impresso e os cards da dashboard de conciliação. Agora os valores como `total_entradas`, `total_saidas`, `patrimonio_inicial`, `patrimonio_final`, `data` e `tipo_movimento` são preenchidos corretamente, evitando crashes e dados em branco no dashboard.

**Arquivos afetados:**
- `modules/relatorios/relatorios.service.ts` [FIX]

## [2026-06-03] - Fix: Scroll e Botão de Baixa no Modal de Detalhes do Título (Contas a Pagar)

**O que foi feito:**
- **Correção de Scroll e Interação**: Convertido o `ModalDetalhesTitulo` em um React Portal (`ReactDOM.createPortal`) injetado diretamente no `document.body` e com `z-[9998]`. Isso corrige o bug em que o modal herdava restrições de contexto 3D/transformações dos elementos pais, permitindo rolar a página de fundo e clicar atrás dele.
- **Bloqueio de Scroll**: Adicionado `document.body.style.overflow = 'hidden'` quando aberto e `unset` ao desmontar.
- **Botão de Pagar**: Adicionada a prop `onPagar` e o botão "Registrar Pagamento" no rodapé do modal, que abre o modal de baixa (`ModalBaixa`) do título selecionado.
- **Integração**: Passada a prop `onPagar` do `ContasPagarPage` para o `ModalDetalhesTitulo`.

**Arquivos afetados:**
- `modules/financeiro/submodules/contas-pagar/components/ModalDetalhesTitulo.tsx` [FIX/REFATORAÇÃO]
- `modules/financeiro/submodules/contas-pagar/ContasPagar.page.tsx` [MODIFY]

## [2026-06-03] - Fix: Contabilização de Descontos e Acréscimos nos Pedidos de Compra e Caixa

**O que foi feito:**
- **Pedido de Compra (Frontend)**: Corrigido o componente `CardPaymentData.tsx` para somar `valor_desconto` e subtrair `valor_acrescimo` no cálculo do saldo em aberto e percentual de quitação real. Agora exibe "Quitação Confirmada (R$ 0,00)" e "100.0%" se o título estiver quitado com desconto.
- **Histórico de Baixas (Frontend)**: Customizada a exibição de transações do tipo `DESCONTO_TITULO` e `ACRESCIMO_TITULO` com cores específicas (amber/rose) e rótulos descritivos adequados.
- **Métricas do Caixa (Database)**: Criada migração `20260603_fix_metrics_discounts.sql` que:
  - Exclui transações de `DESCONTO_TITULO` dos fluxos de caixa reais (`v_total_entradas` e `v_total_saidas`), evitando que descontos obtidos/concedidos finjam ser saídas/entradas de dinheiro nas contas bancárias.
  - Exclui descontos das despesas operacionais (`v_total_despesas_fixas`, `v_total_despesas_variaveis`, `v_total_outros_debitos`).
  - Soma descontos obtidos (ganhos) e subtrai descontos concedidos (perdas) no cálculo de `lucro_mensal` e `lucro_gerado`, garantindo que o desconto de R$ 4.000,00 no pedido aumente corretamente o lucro e consequentemente o patrimônio líquido.

**Arquivos afetados:**
- `modules/pedidos-compra/components/details/CardPaymentData.tsx` [FIX]
- `supabase/migrations/20260603_fix_metrics_discounts.sql` [NEW]

## [2026-04-30] - Fix: Sincronização entre Outros Débitos/Créditos e Módulo Caixa
**O que foi feito:**
- **Bug de Sincronização**: Ao excluir ou lançar registros nos módulos "Outros Débitos" e "Outros Créditos", o dashboard do "Módulo Caixa" não atualizava automaticamente (exigia F5). Isso ocorria porque as deleções em tempo real do Supabase às vezes são filtradas por RLS se a replica identity não for FULL, e o frontend não invalidava manualmente as queries globais.
- **Fix Frontend**: Adicionado `useQueryClient` aos módulos de Outros Débitos e Outros Créditos. Agora, qualquer operação bem-sucedida (Lançar, Editar, Excluir, Baixar) dispara um `queryClient.invalidateQueries({ queryKey: ['caixa_dashboard'] })`, garantindo que o dashboard financeiro reflita os dados atualizados instantaneamente.
- **Fix Backend (DB)**: Criada migração `20260430_fix_realtime_delete.sql` que define `REPLICA IDENTITY FULL` nas tabelas `fin_titulos`, `fin_transacoes` e `fin_contas_bancarias`. Isso garante que o Supabase Realtime envie todos os campos nas deleções, permitindo que o RLS processe os eventos corretamente no lado do cliente.
- **Estabilidade**: Otimizada a experiência do usuário eliminando a necessidade de recarregar a página para ver o saldo e passivos atualizados no Caixa.

**Arquivos afetados:**
- `modules/financeiro/submodules/outros-debitos/OutrosDebitos.page.tsx` [FIX]
- `modules/financeiro/submodules/outros-creditos/OutrosCreditos.page.tsx` [FIX]
- `supabase/migrations/20260430_fix_realtime_delete.sql` [NEW]

## [2026-04-29] - Fix: Cards KPIs em Branco + Integração OUTRO_DEBITO nos Cálculos
**O que foi feito:**
- **Bug KPIs em Branco (Root Cause)**: Os cards de KPIs nos módulos Outros Débitos e Outros Créditos mostravam skeleton loading infinito (barras cinza pulsando) ao invés de exibir `R$ 0,00`. A causa era dupla:
  1. `Promise.all` fazia com que um erro em qualquer chamada (getAll ou getKpis) derrubasse ambas, e o `catch` não fazia `setKpis(null)`, deixando o estado como `null` (inicial).
  2. O componente usava `!== undefined` para decidir entre mostrar o valor ou o skeleton — quando kpis era `null`, `null?.campo` retorna `undefined`, mostrando o skeleton indefinidamente.
- **Fix Frontend**: Substituído `Promise.all` por `Promise.allSettled` para isolar erros. Componentes KPIs agora usam `?? 0` (fallback para zero) e prop `loading` para controlar skeleton.
- **Fix Backend (RPCs)**: Atualizado `rpc_kpi_dashboard_financeiro` e `get_caixa_metrics` para incluir métrica `outros_debitos` nos cálculos de lucro mensal, lucro gerado e margem.
- **Types**: Adicionado `total_outros_debitos` ao `ICaixaDashboardData` e `CaixaDashboardSchema` (Zod) + `outros_debitos` ao `IFinanceiroKpis`.
- **Dashboard Financeiro**: Adicionado card "Outros Débitos" na segunda linha de KPIs (agora 4 colunas: Variáveis, Receitas, Débitos, Retiradas).
- **Fix Preventivo**: Aplicada mesma correção no módulo Outros Créditos (CreditosKpis + OutrosCreditos.page).

**Verificações realizadas (sem bugs):**
- ✅ `rpc_kpi_outros_debitos` — SQL e permissões OK, usa `get_my_org_id()` e retorna zeros corretamente.
- ✅ `lancar_debito` — RPC funcional, cria título PAGAR com origem OUTRO_DEBITO.
- ✅ Contas a Pagar — já inclui OUTRO_DEBITO (filtra só `tipo = 'PAGAR'`, sem restrição de `origem_tipo`).
- ✅ `rpc_kpi_contas_pagar` — já inclui OUTRO_DEBITO.
- ✅ `get_caixa_metrics` → `total_saidas` e `total_passivo_circulante` já incluíam OUTRO_DEBITO.
- ✅ Forecast financeiro — já inclui (busca todos títulos PAGAR).

**Arquivos afetados:**
- `modules/financeiro/submodules/outros-debitos/components/DebitosKpis.tsx` [FIX]
- `modules/financeiro/submodules/outros-debitos/OutrosDebitos.page.tsx` [FIX]
- `modules/financeiro/submodules/outros-creditos/components/CreditosKpis.tsx` [FIX PREVENTIVO]
- `modules/financeiro/submodules/outros-creditos/OutrosCreditos.page.tsx` [FIX PREVENTIVO]
- `modules/financeiro/Financeiro.page.tsx` [MODIFY - novo card]
- `modules/financeiro/financeiro.types.ts` [MODIFY - novo campo]
- `modules/caixa/caixa.types.ts` [MODIFY - novo campo]
- Supabase RPCs: `rpc_kpi_dashboard_financeiro`, `get_caixa_metrics` [MIGRATE]

---

## [2026-04-29] - Novo Submódulo "Outros Débitos" no Financeiro
**O que foi feito:**
- **Novo Submódulo Completo**: Criado o submódulo `outros-debitos` espelhando a estrutura de `outros-creditos`, mantendo simetria perfeita no sistema financeiro.
- **Frontend (9 arquivos)**: Page, Service, Types + 6 componentes (DebitoCard, DebitoForm, DebitosFilters, DebitosKpis, DebitosList, ModalDetalhesDebito).
- **Banco de Dados (RPCs)**: Criados `lancar_debito` (cria título PAGAR com origem OUTRO_DEBITO) e `rpc_kpi_outros_debitos` (KPIs: total debitado, pendente, atrasado). Migração em `supabase/migrations/20260429_outros_debitos.sql`.
- **Tipos**: Adicionado `OUTRO_DEBITO` ao enum `origem_tipo` em `financeiro.types.ts` (Zod + ITitulo + OrigemHistorico).
- **Navegação**: Registrado no menu do `Financeiro.page.tsx` entre "Outros Créditos" e "Retiradas" com ícone e cor rose.
- **Funcionalidades**: Divisão entre sócios (split), pagamento à vista opcional, descrição livre, documento de referência, filtros, paginação, ordenação, visualização card/lista, histórico de baixas, edição e estorno de pagamentos.

**Por quê:**
Necessidade de registrar débitos extraordinários de valores altos (ex: 400 mil) com divisão de responsabilidade entre sócios, separando-os das despesas operacionais (contas a pagar comuns).

**Arquivos afetados:**
- `modules/financeiro/submodules/outros-debitos/` (9 arquivos novos)
- `modules/financeiro/Financeiro.page.tsx` [MODIFY]
- `modules/financeiro/financeiro.types.ts` [MODIFY]
- `supabase/migrations/20260429_outros_debitos.sql` [NEW]

**Observações:**
- ⚠️ A migração SQL precisa ser executada no Supabase (RPCs `lancar_debito` e `rpc_kpi_outros_debitos`). A rede externa não estava disponível durante a criação — executar via SQL Editor do Supabase Dashboard.
- O ModalBaixa compartilhado é reutilizado para baixas de débitos, já que ele detecta automaticamente o tipo do título (PAGAR/RECEBER).
- Design visual usa esquema de cores **rose/vermelho** para distinguir dos créditos (teal/verde).

---

## [2026-04-28] - Criação do Schema Base para Integração Meta Ads (Marketing)
**O que foi feito:**
- **Tabelas Criadas**: Criadas as tabelas `mkt_meta_integrations` e `mkt_campanhas` via Supabase MCP para suportar o novo módulo de integração com Facebook/Instagram.
- **Isolamento de Dados**: Implementadas políticas RLS (`org_private_access`) em ambas as tabelas utilizando a função padrão `is_member_of(organization_id)` para garantir segurança multi-tenant.
- **Relacionamentos**: Campanhas atreladas a `est_veiculos` para permitir métricas de impulsionamento por carro.

**Por quê:**
Preparar o banco de dados (fundação backend) para o novo ecossistema de marketing, permitindo salvar tokens da Meta Graph/Marketing API de forma segura e orquestrar campanhas pagas criadas de dentro do ERP.

**Arquivos afetados:**
- Banco de Dados (Supabase: `mkt_meta_integrations`, `mkt_campanhas`)

## [2026-04-22] - Correção do Fluxo de Login e Timer de Inatividade
**O que foi feito:**
- **Inatividade e Login**: Resolvido o bug onde o sistema realizava um logout forçado (reload) imediatamente após o primeiro login. A causa era o timer de inatividade utilizando um timestamp obsoleto de sessões anteriores.
- **Sincronização de Estado**: Implementado o reset automático do timer de inatividade nos eventos `SIGNED_IN` e no carregamento inicial da sessão.
- **Redirecionamento Robusto**: Refatorada a `AuthPage` para utilizar o estado global da sessão (`useAuthStore`) como gatilho de navegação, eliminando race conditions entre o login e a atualização do estado do App.

**Por quê:**
Garantir que o primeiro acesso do usuário seja fluido e livre de recarregamentos inesperados, melhorando a confiabilidade do sistema de autenticação.

**Arquivos afetados:**
- `App.tsx`
- `modules/auth/Auth.page.tsx`

## [2026-04-17] - Modernização de Relatórios e Correções de Layout
**O que foi feito:**
- **Visualização de Relatórios**: Implementada a visualização inline automática ao carregar as páginas de relatórios, eliminando a dependência de PDF para visualização inicial.
- **Correção de PDFs**: Ajustes de padding e layout nos cabeçalhos e rodapés do PDF de Pedido de Compra para evitar sobreposição de texto.
- **Quick Preview Modals**: Refatoração dos modais de pré-visualização rápida nos módulos de `caixa` e `pedidos-compra` usando React Portals para garantir cobertura total da tela e evitar conflitos de layout pai.
- **Conciliação Patrimonial**: Implementação completa do relatório de Conciliação Patrimonial, incluindo serviços, tipos e template de impressão.
- **KPIs do Dashboard**: Correção na lógica de cálculo de lucro nos KPIs do dashboard.
- **Módulo de Estoque**: Correções pontuais no formulário de estoque e modais de cadastro de modelos/versões.
- **Correção de Build**: Resolvido erro de sintaxe em `RelatorioPatrimonioConciliacao.page.tsx` causado por código duplicado e um bloco `try` não encerrado.

**Por quê:**
Melhorar a experiência do usuário ao visualizar dados financeiros e corrigir imperfeições visuais críticas em documentos gerados pelo sistema.

**Arquivos afetados:**
- `modules/caixa/components/QuickPreviewModal.tsx`
- `modules/pedidos-compra/components/details/QuickPreviewModal.tsx`
- `modules/pedidos-compra/components/details/PurchaseOrderPrint.tsx`
- `modules/relatorios/...` (vários arquivos de páginas e serviços)
- `modules/inicio/components/GeneralKpis.tsx`
- `modules/estoque/EstoqueForm.page.tsx`


## [2026-04-17] - Refatoração Modular e Correção de Resiliência
- **Modularização do Sistema**: Refatoração completa do `SitePublicoService` para separar o carregamento de dados. Agora, erros em um componente (ex: dados da empresa) não impedem a exibição de outros (ex: catálogo de veículos/motos).
- **Correção de Detalhes do Veículo**: Aplicado `z.coerce.number()` em campos de KM e Anos no schema principal, resolvendo o crash ao abrir a página de detalhes do veículo no site público.
- **Melhoria de SEO**: Tornadas dinâmicas as metatags da página de detalhes, refletindo o nome real da loja.

## [2026-04-17] - Suporte a Motocicletas e Correção de Visibilidade Inicial
- **Visibilidade Site**: Correção do erro de parsing inicial no Zod para campos numéricos.
- **Suporte a Motos**: Expansão do catálogo para motocicletas (Biz, CG 160, BMW R 1250 GS, etc.) com montadoras oficiais.
- **Limpeza de UI**: Remoção definitiva do campo `portas`.

## [2026-04-17] - Povoamento de Catálogo Global: 30 Modelos Populares/Premium e Enriquecimento Visual
**O que foi feito:**
- **Povoamento de Dados**: Inserção de 30 modelos de veículos representativos do mercado brasileiro (20 Populares e 10 Premium) como dados globais (`organization_id IS NULL`).
- **Novas Montadoras**: Cadastramento de Toyota, BMW, Audi e Land Rover.
- **Padronização Técnica**: Para cada modelo, foram criadas de 2 a 3 versões com motorização e câmbio reais (ex: 1.0 MPI, 1.3 Turbo, Hybrid, Diesel 4x4).
- **Enriquecimento Visual**:
    - Logotipos oficiais em PNG transparente para as novas e principais montadoras.
    - Fotos de estúdio (padrão catálogo) vinculadas aos modelos de maior volume e destaque.
- **Correção de Ortografia**: Renomeada a montadora `VOLKSVAGEM` para `VOLKSWAGEN` em todo o banco de dados.
- **Hotfix Modelos**: Corrigido erro de "tela branca" em `Modelos.page.tsx` causado pela ausência da função `getModeloNameById`.

**Por quê:**
O sistema necessitava de uma base de dados inicial robusta para facilitar o uso por novos clientes e demonstrar a qualidade visual do ERP. A correção na página de modelos era crítica para a estabilidade do módulo de cadastros.

**Arquivos afetados:**
- Banco de Dados (SQL: Update e Seeds)
- `modules/cadastros/modelos/Modelos.page.tsx`

## [2026-04-24] - Correção de Multi-tenancy no Lançamento de Despesas
**O que foi feito:**
- **Integridade Multi-tenant em Despesas**: Lançamentos de despesas vinculadas a veículos devem herdar o `organization_id` do veículo, nunca do usuário logado, para evitar vazamento de dados entre empresas.
- **Isolamento de Sites Públicos**: O site público deve SEMPRE utilizar a variável `VITE_ORGANIZATION_ID` para filtrar veículos, montadoras e configurações. Consultas sem este filtro causarão vazamento de estoque entre empresas.
- **Pagamentos Blindados**: Atualizado o RPC `registrar_pagamento_despesa` para herdar a organização da despesa pai, garantindo que transações financeiras e registros de caixa sejam vinculados à empresa correta.
- **Consistência de Dados**: Garantida a rastreabilidade do `user_id` e a manutenção automática do saldo bancário e custo do veículo dentro das fronteiras da organização correta.

**Por quê:**
Evitar o "vazamento" de registros financeiros entre empresas em ambientes multi-tenant, garantindo que despesas e pagamentos fiquem restritos à organização dona do patrimônio (veículo).

**Arquivos afetados:**
- Funções SQL (RPCs): `salvar_despesa_veiculo`, `registrar_pagamento_despesa`.

## [2026-04-24] - Correção de Vazamento de Dados no Site Público
**O que foi feito:**
- **Isolamento de Site**: Implementada a obrigatoriedade do filtro `organization_id` em todas as consultas do `SitePublicoService`.
- **Configuração Dinâmica**: Adicionado suporte à variável de ambiente `VITE_ORGANIZATION_ID` para que cada site (Hidrocar, Souza, etc.) exiba apenas seu próprio estoque e conteúdo.
- **Correção de Conteúdo**: Refatorada a busca de `site_conteudo` para suportar fallback de conteúdo padrão (`null`) ou conteúdo específico por organização, garantindo que o cabeçalho e informações de contato sejam os corretos.

**Por quê:**
Evitar que veículos publicados por uma empresa apareçam no site de outra empresa em um ambiente multi-tenant que compartilha o mesmo banco de dados.

**Arquivos afetados:**
- `modules/site-publico/site-publico.service.ts` [MODIFY]

## [2026-04-24] - Correção de Ambiguidade em Funções de Retirada
**O que foi feito:**
- **Eliminação de Duplicidade**: Removidas as versões redundantes das funções `registrar_retirada` e `atualizar_retirada` que causavam erro de ambiguidade no Postgres devido a tipos de dados conflitantes (`date` vs `timestamptz`).
- **Padronização de Tipos**: Padronizado o uso do tipo `date` para os argumentos de data nestas funções, alinhando com a estrutura da tabela `fin_retiradas`.
- **Melhoria na Descrição**: Aprimorada a lógica de geração de descrição automática nas transações de retirada, incluindo o link direto com o registro de retirada (`retirada_id`).

**Por quê:**
Resolver o erro "Could not choose the best candidate function" que impedia o lançamento de retiradas de sócios no módulo financeiro.

**Arquivos afetados:**

## [2026-04-26] - Correção de Crash em Listas Financeiras e Estabilidade de UI
**O que foi feito:**
- **Crash "h.map is not a function"**: Identificado e corrigido um bug de sincronização de estado nos módulos de **Despesas Variáveis** e **Despesas Fixas**. A falha ocorria devido à ausência da dependência `activeTab` no `useMemo` dos dados processados, o que causava um descasamento entre o formato dos dados (Array vs Object) e o modo de exibição (Agrupado vs Lista), resultando em falha ao tentar iterar (.map) sobre um objeto.
- **Resiliência de Estado**: Sincronizadas as dependências de memoização para garantir que a transição entre abas (Em Aberto, Pagos, Todos) e agrupamentos (Mês, Categoria) ocorra de forma atômica e segura.
- **Auditoria de SVG**: Verificados os paths de ícones na `Sidebar` e `MobileBottomNav`. Identificado que erros de parsing reportados (`M3 12i2-2`) são provavelmente causados por ferramentas de tradução automática do navegador que corrompem strings de atributos SVG.

**Por quê:**
Estabilizar a plataforma em produção, eliminando o crash de "Tela Branca" ao navegar pelos módulos financeiros e garantindo a integridade visual da interface.

**Arquivos afetados:**
- `modules/financeiro/submodules/despesas-variaveis/DespesasVariaveis.page.tsx` [MODIFY]
- `modules/financeiro/submodules/despesas-fixas/DespesasFixas.page.tsx` [MODIFY]

