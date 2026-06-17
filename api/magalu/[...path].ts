import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Proxy reverso para a API da Magalu.
 *
 * Por que existe:
 *  - CORS: o navegador não consegue chamar `api.magalu.com` diretamente. Chamando
 *    este endpoint (mesma origem do app), o navegador fica feliz e o servidor
 *    repassa a requisição à Magalu, onde CORS não se aplica.
 *  - O token de acesso continua vindo da UI (header Authorization) e é apenas
 *    repassado adiante — este proxy não armazena nem inspeciona o token.
 *
 * Mapeamento de rotas (catch-all):
 *   /api/magalu/seller/v1/orders?_offset=0  ->  https://api.magalu.com/seller/v1/orders?_offset=0
 *   /api/magalu/seller/v1/portfolios/skus/X ->  https://api.magalu.com/seller/v1/portfolios/skus/X
 */

const MAGALU_BASE = 'https://api.magalu.com';

// Cabeçalhos hop-by-hop que não devem ser repassados adiante.
const STRIPPED_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'accept-encoding',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // O segmento dinâmico [...path] chega em req.query.path como string[] (ou string).
  const rawPath = req.query.path;
  const segments = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  const targetPath = segments.map((s) => encodeURIComponent(s)).join('/');

  const url = new URL(`${MAGALU_BASE}/${targetPath}`);

  // Repassa a query string original (exceto o próprio "path" injetado pelo roteador).
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v));
    } else if (value != null) {
      url.searchParams.append(key, value);
    }
  }

  // Monta os headers repassados, preservando o Authorization vindo da UI.
  const headers: Record<string, string> = { Accept: 'application/json' };
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (STRIPPED_HEADERS.has(key.toLowerCase())) continue;
    headers[key] = Array.isArray(value) ? value.join(', ') : value;
  }

  const init: RequestInit = { method: req.method, headers };

  // Repassa o corpo para métodos que o suportam (preparado para futuros POST/PUT).
  if (req.method && !['GET', 'HEAD'].includes(req.method) && req.body != null) {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!headers['content-type'] && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  try {
    const upstream = await fetch(url.toString(), init);
    const body = await upstream.text();

    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    res.status(upstream.status).send(body);
  } catch (error: any) {
    res.status(502).json({
      message: 'Falha ao contatar a API da Magalu através do proxy.',
      detail: error?.message ?? String(error),
    });
  }
}
