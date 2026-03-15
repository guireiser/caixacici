# Caixa Cici - Controle de Renda Fixa

Aplicacao web para controle de investimentos em renda fixa com:
- **acesso restrito**: ao entrar, o site exige senha de admin; apos login nao pede novamente (sessao na mesma aba; botao Sair encerra).
- interface corporativa (layout inspirado em sites como Pfiffner Group): tela de login, top bar, hero, tabela em card;
- tabela no mesmo formato da planilha base;
- cadastro, edicao e exclusao de investimentos (somente admin);
- campos **Data** e **Vencimento**: digitacao apenas numerica com mascara dd/mm/aaaa (sem datepicker; igual a interfaces desktop);
- atualizacao manual de indices por botao (`SELIC`, `IPCA` e `CDI = SELIC - 0,1%`);
- calculo de valor atual, rendimento liquido (apos IR) e valor atual liquido;
- **tipos de indexador**: SELIC, IPCA, CDI e **Pre-fixada** (taxa anual fixa, sem indicador; campo multiplicador desabilitado);
- **LCA/LCI**: investimentos cujo nome contem "LCA" ou "LCI" sao considerados isentos de IR (nenhum desconto);
- **backup local**: botao "Download backup" para baixar os dados da carteira em JSON;
- publicacao gratuita no GitHub Pages.

## Stack

- Front-end: Vite + JavaScript (GitHub Pages), layout corporativo (tipografia Inter, paleta neutra)
- Persistencia: `jsonbin.io`
- Proxy e seguranca: Cloudflare Worker
- Fontes de indices: API SGS Banco Central

## Regras de negocio implementadas

- Conversao de taxa anual para diaria: capitalizacao composta com **365 dias**.
- Taxa efetiva anual:
  - **Pre-fixada**: `taxaFixa` (multiplicador ignorado).
  - **Demais**: `indexadorAnual * (multiplicador/100) + taxaFixa`
- **LCA/LCI**: se o campo "Investimento" contiver "LCA" ou "LCI", nao ha desconto de IR (rendimento liquido = bruto).
- **Exemplos de validacao:**
  - Tesouro SELIC com taxa fixa 0,12% e SELIC 15%: rendimento anual = 15% + 0,12% = **15,12%**
  - CDB 110,5% do CDI com SELIC 15%: CDI = 15% - 0,1% = 14,9%; taxa = 110,5% × 14,9% = **16,4645%**
- CDI derivado:
  - `CDI = SELIC - 0,1` (pontos percentuais anuais)
- IR sobre rendimento bruto por prazo:
  - ate 180 dias: 22,5%
  - 181 a 360 dias: 20,0%
  - 361 a 720 dias: 17,5%
  - acima de 720 dias: 15,0%

## Estrutura da tabela

Colunas:
- Data
- Valor
- Investimento
- Indexador
- Taxa fixa
- Multiplicador
- Vencimento
- Valor atual
- Rendimento-IR
- Valor atual -IR

## Atualizacao de indices (manual)

- O app mostra `Ultima atualizacao: dd/mm/aaaa hh:mm`.
- Status visual:
  - verde: atualizado no dia
  - vermelho: desatualizado
- Botao **Atualizar dados**:
  - busca SELIC e IPCA no BCB;
  - deriva CDI;
  - recalcula carteira;
  - salva no jsonbin.

## APIs utilizadas (via Worker)

- SELIC (serie SGS 11):
  - `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=DD/MM/AAAA&dataFinal=DD/MM/AAAA`
- IPCA (serie SGS 10844):
  - `https://api.bcb.gov.br/dados/serie/bcdata.sgs.10844/dados?formato=json&dataInicial=DD/MM/AAAA&dataFinal=DD/MM/AAAA`

Conversoes aplicadas no Worker:
- SELIC diaria -> anual (base 252): `((1 + diaria/100)^252 - 1) * 100`
- IPCA mensal -> anual: `((1 + mensal/100)^12 - 1) * 100`

## Execucao local

### 1) Front-end

```bash
npm install
npm run dev
```

### 2) Worker

```bash
cd worker
npm install
npm run dev
```

### 3) Tudo na rede local (PC + celular no mesmo Wi-Fi)

Na raiz do projeto, um unico comando sobe o front e o Worker e gera um config para o IP da sua maquina (por padrao `192.168.1.11`), sem alterar o `public/config.js` usado no deploy:

```bash
npm install
npm run dev:lan
```

- Gera `public/config.lan.js` (nao commitado) com a API em `http://192.168.1.11:8787`.
- O Vite em modo dev serve esse config quando existe; o build e o GitHub Pages continuam usando `public/config.js` (URL do Worker em producao).
- No celular, abra no navegador o endereco **Network** que o Vite mostrar (ex.: `http://192.168.1.11:5173`).

Para outro IP, use: `LAN_IP=192.168.0.10 npm run dev:lan` (no PowerShell: `$env:LAN_IP="192.168.0.10"; npm run dev:lan`).

## Configuracao do jsonbin

1. Crie conta em [jsonbin.io](https://jsonbin.io/).
2. Crie um bin com payload inicial:

```json
{
  "investments": [],
  "meta": {
    "lastIndexUpdateAt": "",
    "lastIndexSnapshot": {
      "selicAnual": 0,
      "ipcaAnual": 0,
      "cdiAnual": -0.1
    },
    "updatedAt": ""
  }
}
```

3. Guarde:
   - `BIN ID`
   - `MASTER KEY`

## Configuracao de seguranca (admin)

Gerar hash SHA-256 da senha admin (PowerShell):

```powershell
$senha = "sua-senha-admin"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($senha)
$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
($hash | ForEach-Object ToString x2) -join ""
```

Use o hash gerado na variavel `ADMIN_PASSWORD_HASH` do Worker.

## Deploy do Worker (Cloudflare)

1. Crie um Worker no Cloudflare.
2. Publique o codigo da pasta `worker`.
3. Configure as variaveis/secrets:
   - `JSONBIN_BIN_ID`
   - `JSONBIN_KEY`
   - `ADMIN_PASSWORD_HASH`
4. Copie a URL publica do Worker, ex.: `https://caixa-cici-worker.<subdominio>.workers.dev`

## Configurar front para usar o Worker

Edite `public/config.js`:

```js
window.APP_CONFIG = {
  apiBaseUrl: "https://caixa-cici-worker.<subdominio>.workers.dev",
};
```

## Publicar no GitHub Pages (partindo do Cursor/VSCode)

No terminal do Cursor, na pasta do projeto:

```bash
git init
git add .
git commit -m "feat: app web de renda fixa com worker e deploy pages"
git branch -M main
git remote add origin https://github.com/<seu-usuario>/<seu-repo>.git
git push -u origin main
```

Depois no GitHub:
1. Abra `Settings > Pages`.
2. Em `Build and deployment`, selecione `GitHub Actions`.
3. O workflow `.github/workflows/deploy-pages.yml` fara o deploy automatico a cada push na `main`.

## Fluxo de uso

1. Abrir o site: exibe apenas tela de login (senha admin).
2. Informar a senha e clicar em **Entrar**: valida no Worker (GET /auth/check) e, se correta, exibe o app e carrega a carteira.
3. Cadastrar investimentos, editar (selecionar linha e **Editar investimento**), usar **Atualizar dados** para indices e recalculo.
4. **Sair**: encerra a sessao e volta à tela de login.

## Operacoes de investimento

- Para editar ou excluir, selecione uma linha da tabela.
- O botao **Excluir investimento** (vermelho, ao lado de **Editar investimento**) pede confirmacao antes de remover.
- A exclusao usa `DELETE /investments/:id` e recalcula a carteira antes de salvar.
- **Download backup**: clica em **Download backup** para baixar um arquivo JSON com a carteira e metadados (para backup local).
