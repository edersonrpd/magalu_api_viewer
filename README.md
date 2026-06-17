# Magalu API Explorer

Interface visual para consultar e visualizar Pedidos e Produtos (Portfólio) do
Seller da Magalu usando a API oficial.

## Arquitetura

O navegador **não** chama `api.magalu.com` diretamente (isso seria bloqueado por
CORS). Em vez disso, todas as requisições passam por um proxy de mesma origem em
`/api/magalu/*`, que repassa a chamada para a Magalu:

```
Navegador  ──►  /api/magalu/...  ──►  https://api.magalu.com/...
            (mesma origem)         (servidor → sem CORS)
```

- **Desenvolvimento (`npm run dev`):** o proxy é o `server.proxy` embutido do
  Vite (ver `vite.config.ts`).
- **Produção (Vercel):** o proxy é a função serverless `api/magalu/[...path].ts`.

O token de acesso é informado na própria interface, salvo apenas no
`localStorage` do navegador e enviado no header `Authorization`, que o proxy
apenas repassa — ele não armazena nem inspeciona o token.

## Rodando localmente

**Pré-requisitos:** Node.js 18+

1. Instale as dependências:
   ```
   npm install
   ```
2. Suba o app:
   ```
   npm run dev
   ```
3. Abra `http://localhost:3000`, cole seu Token Magalu (Bearer) no topo e
   comece a consultar.

## Deploy (Vercel)

O projeto é detectado automaticamente como app Vite. A pasta `api/` é servida
como funções serverless. Nenhuma variável de ambiente é necessária — o token
vem da interface.

```
npm run build   # gera o build estático em dist/
```
