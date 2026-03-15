# AGENTS - Caixa Cici

Guia rapido para agentes/manutencao deste projeto.

## Objetivo do sistema

Aplicacao web para controlar investimentos de renda fixa com:
- persistencia em jsonbin;
- interface publica no GitHub Pages;
- escrita protegida por admin no Cloudflare Worker;
- operacoes de cadastro, edicao e exclusao de investimentos;
- atualizacao manual de indices por botao.


## Arquitetura

- Front-end (`index.html`, `src/*`):
  - **Login obrigatorio**: ao abrir o site exibe apenas tela de senha; apos login valido (GET /auth/check), exibe o app e mantem sessao em sessionStorage (sem pedir senha de novo ate fechar a aba ou clicar em Sair).
  - top bar com marca e status de atualizacao;
  - hero e barra de acoes (Novo, Editar, Excluir, Download backup, Atualizar dados, Sair);
  - renderiza tabela em card;
  - abre modal de novo/edicao;
  - campos de data (Data e Vencimento): input texto com **mascara dd/mm/aaaa**, apenas numeros no teclado e autoformatacao (sem datepicker).
  - chama API do Worker com header x-admin-password em todas as requisicoes (GET /investments tambem exige admin).
  - Layout corporativo (referencia Pfiffner Group): tipografia Inter, paleta neutra, acento azul.
- Worker (`worker/index.js`):
  - autentica admin por hash SHA-256 (`x-admin-password`);
  - integra com jsonbin;
  - consulta BCB para SELIC/IPCA;
  - anualiza SELIC diaria em base 252;
  - deriva CDI (`SELIC - 0,1%`);
  - recalcula carteira e persiste.
- Regras compartilhadas (`shared/calculos.js`):
  - conversao anual->diaria (365);
  - calculos de valor atual;
  - taxa efetiva anual: para **PREFIXADA** é só `taxaFixa`; para SELIC/IPCA/CDI: `indexadorAnual * (multiplicador/100) + taxaFixa` (ex.: Tesouro SELIC 15%+0,12%=15,12%; CDB 110,5% CDI com CDI 14,9%=16,4645%);
  - IR por faixas de prazo; **LCA/LCI** (substring "LCA" ou "LCI" no campo investimento): sem IR (aliquota 0).

## Endpoints do Worker

- `GET /auth/check` — valida senha admin (header `x-admin-password`); retorna 200 se ok, 401 se invalido.
- `GET /investments` — exige admin; retorna carteira.
- `POST /investments` (admin)
- `PUT /investments/:id` (admin)
- `DELETE /investments/:id` (admin)
- `POST /indices/update` (admin)
- `GET /health`

Indexadores aceitos: SELIC, IPCA, CDI, PREFIXADA (Pre-fixada: taxa fixa anual apenas; multiplicador desabilitado no formulario).

## Convencoes de dados

Cada investimento deve manter:
- `id`, `data`, `valor`, `investimento`, `indexador`, `taxaFixa`, `multiplicador`, `vencimento`
- calculados: `valorAtual`, `rendimentoIR`, `valorAtualIR`
- apoio: `createdAt`, `updatedAt`, `lastCalcDate`, `aliquotaIR`, `diasCorridos`, `taxaEfetivaAnual`

Metadados da carteira:
- `lastIndexUpdateAt`
- `lastIndexSnapshot.selicAnual`
- `lastIndexSnapshot.ipcaAnual`
- `lastIndexSnapshot.cdiAnual`
- `updatedAt`

## Regra de negocio critica

- O app **nao** atualiza indices automaticamente ao abrir.
- Atualizacao ocorre apenas no botao **Atualizar dados**.
- Status visual deve refletir desatualizado (vermelho) quando nao atualizado no dia.

## Deploy

- Deploy: Front no GitHub Pages via `.github/workflows/deploy-pages.yml`; Worker em Cloudflare. `public/config.js` deve ter a URL do Worker em producao.
- Desenvolvimento na rede local: `npm run dev:lan` sobe front + Worker e usa `public/config.lan.js` (gerado, nao commitado) com IP da maquina; nao altera o deploy.

## Checklist apos mudancas

1. Rodar `npm run build` na raiz.
2. Validar import do Worker (`node -e "import('./index.js')"` em `worker/`).
3. Confirmar que a tabela manteve as colunas do modelo.
4. Confirmar regras de IR e CDI.
5. Atualizar `README.md` e este `AGENTS.md` quando houver novos recursos/alteracoes.
