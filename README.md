# Magalu API Explorer

Interface visual para consultar e visualizar Pedidos e Produtos (Portfólio) do
Seller da Magalu usando a API oficial.

## Funcionalidades

- **Buscar Pedido:** consulta um ou vários pedidos por código (separados por
  vírgula) e exibe cliente, endereço de entrega, pagamento, entregas com itens e
  resumo financeiro.
- **Listar Pedidos:** lista paginada dos pedidos do seller, com detalhe de cada
  pedido.
- **Produtos (Portfólio):** busca SKU(s) individualmente ou lista o portfólio
  completo, exibindo dados do produto, **preço** e **estoque**. Inclui opção de
  "Carregar Todos" via paginação automática.
- **JSON bruto:** qualquer resultado pode ser inspecionado no formato bruto da
  API, com cópia rápida.
- **Token na interface:** o token Bearer é informado no topo, validado
  visualmente e guardado apenas no `localStorage` do navegador.

## Stack

- React 19 + TypeScript
- Vite 6 (build e dev server)
- Tailwind CSS (via CDN) e ícones `lucide-react`
- Deploy na Vercel (proxy via `vercel.json`)

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
- **Produção (Vercel):** o proxy é um *rewrite* nativo da Vercel (ver
  `vercel.json`), que reencaminha `/api/magalu/*` para `https://api.magalu.com/*`
  preservando caminho, query string e o header `Authorization`.

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

O projeto é detectado automaticamente como app Vite. O proxy para a Magalu é
feito pelo rewrite em `vercel.json` (não há funções serverless). Nenhuma
variável de ambiente é necessária — o token vem da interface.

```
npm run build   # gera o build estático em dist/
```
