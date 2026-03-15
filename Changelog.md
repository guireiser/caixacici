# Changelog

Alterações notáveis do projeto Caixa Cici.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

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
