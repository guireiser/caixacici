# Worker (Cloudflare) - Caixa Cici

Este Worker protege operacoes de escrita (admin) e faz proxy para:
- `jsonbin.io` (persistencia da carteira)
- API SGS do Banco Central (SELIC e IPCA)

**Segredos nao ficam no repositorio.** Use Cloudflare Secrets em producao e `worker/.dev.vars` no desenvolvimento (arquivo ignorado pelo git; copie de `.dev.vars.example`).

## Endpoints

- `GET /auth/check` - valida senha admin (header `x-admin-password`); 200 se ok, 401 se invalida.
- `GET /investments` - leitura da carteira (exige admin)
- `POST /investments` - cria investimento (admin)
- `PUT /investments/:id` - atualiza investimento (admin)
- `DELETE /investments/:id` - remove investimento (admin)
- `POST /indices/update` - atualiza SELIC/IPCA, deriva CDI e recalcula carteira (admin)
- `GET /health` - health check

## Secrets (producao)

Configure com Wrangler (recomendado) ou no painel do Worker **Settings > Variables and Secrets**:

```bash
cd worker
npx wrangler secret put JSONBIN_BIN_ID
npx wrangler secret put JSONBIN_KEY
npx wrangler secret put ADMIN_PASSWORD_HASH
```

Opcional — **recomendado em producao**: restringir CORS a origem do GitHub Pages (e dominio customizado, se houver):

```bash
npx wrangler secret put ALLOWED_ORIGINS
# Exemplo de valor (uma linha, virgulas sem espacos entre origens):
# https://seu-usuario.github.io,https://www.seudominio.com.br
```

Se `ALLOWED_ORIGINS` nao estiver definido, o Worker usa `Access-Control-Allow-Origin: *` (compativel com deploys antigos, menos restritivo).

Exemplo para gerar `ADMIN_PASSWORD_HASH` (SHA-256 hex da senha):

```powershell
echo -n "sua-senha" | openssl dgst -sha256
```

## Desenvolvimento local

1. Copie `worker/.dev.vars.example` para `worker/.dev.vars` e preencha `JSONBIN_BIN_ID`, `JSONBIN_KEY`, `ADMIN_PASSWORD_HASH`.
2. Para o front em `http://localhost:5173`, mantenha `ALLOWED_ORIGINS` no exemplo ou inclua o IP da sua LAN se usar `npm run dev:lan` (ex.: `http://192.168.1.11:5173`).

```bash
cd worker
npm install
npm run dev
```

## Deploy

```bash
cd worker
npm run deploy
```

Apos o primeiro deploy sem variaveis no `wrangler.toml`, confirme que os tres secrets obrigatorios estao definidos no Cloudflare. Se voce ja tinha commitado credenciais no git, **gere nova Master Key no JsonBin e nova senha admin** e atualize os secrets.
