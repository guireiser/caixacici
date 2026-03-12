# Worker (Cloudflare) - Caixa Cici

Este Worker protege operacoes de escrita (admin) e faz proxy para:
- `jsonbin.io` (persistencia da carteira)
- API SGS do Banco Central (SELIC e IPCA)

## Endpoints

- `GET /auth/check` - valida senha admin (header `x-admin-password`); 200 se ok, 401 se invalida.
- `GET /investments` - leitura da carteira (exige admin)
- `POST /investments` - cria investimento (admin)
- `PUT /investments/:id` - atualiza investimento (admin)
- `POST /indices/update` - atualiza SELIC/IPCA, deriva CDI e recalcula carteira (admin)
- `GET /health` - health check

## Secrets e variaveis

Configure no painel do Cloudflare Worker:

- `JSONBIN_BIN_ID`: ID do bin no jsonbin.io
- `JSONBIN_KEY`: Master key do jsonbin.io
- `ADMIN_PASSWORD_HASH`: hash SHA-256 (hex) da senha de admin

Exemplo para gerar hash da senha:

```powershell
echo -n "sua-senha" | openssl dgst -sha256
```

## Execucao local

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
