# Changelog

Alterações notáveis do projeto Caixa Cici.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [0.3.0] - 2025-03-15

### Adicionado

- **Dashboard**: seção de resumo da carteira (visível quando há investimentos) com:
  - Cards de totais: Valor investido, Valor atual (aprox.), Rendimento bruto (com rentabilidade % sobre o aplicado), Rendimento líquido (após IR) e número de ativos.
  - Gráfico de rosca com distribuição do valor atual por indexador (SELIC, IPCA, CDI, Pré-fixada).
  - Lista dos próximos 5 vencimentos (nome, data, valor atual).
- **Layout responsivo**: dashboard e tabela adaptados para desktop e celular; cards em grid de 4 colunas no desktop e 2 colunas no mobile; gráficos em 2 colunas no desktop e empilhados no mobile.
- Dependência **Chart.js** para os gráficos do dashboard.

### Alterado

- Nova seção do dashboard inserida entre o hero e a barra de ações; oculta quando não há investimentos.

## [0.2.0] - 2025-03-15

### Adicionado

- **Tipo de rendimento Pré-fixada**: novo indexador "Pré-fixada" em que a rentabilidade é apenas a taxa fixa anual informada, independente de SELIC/IPCA/CDI. O campo "Taxa fixa anual" passa a ser a taxa pré-fixada; o campo "Multiplicador" fica desabilitado e irrelevante para esse tipo.
- **Isenção de IR para LCA/LCI**: investimentos cujo nome (campo "Investimento") contém a substring "LCA" ou "LCI" não têm imposto de renda descontado; o cálculo considera rendimento líquido igual ao bruto e valor atual líquido igual ao valor atual.
- **Download de backup**: botão "Download backup" na barra de ações que baixa um arquivo JSON com a carteira e metadados atuais (dados do banco) para backup local. Nome do arquivo: `caixa-cici-backup-AAAA-MM-DD.json`.

### Alterado

- Validação do Worker passa a aceitar o indexador `PREFIXADA` (ou `PRE` normalizado para `PREFIXADA`).
- Na tabela, a coluna "Multiplicador" exibe "—" quando o indexador é Pré-fixada.

## [0.1.0] - (inicial)

- Aplicação web de controle de investimentos em renda fixa.
- Login por senha, persistência em jsonbin, Worker Cloudflare, índices BCB (SELIC, IPCA, CDI).
- Cadastro, edição e exclusão de investimentos; atualização manual de índices; tabela com valor atual e IR por faixas.
