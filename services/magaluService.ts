import { Order, OrdersListResponse, PortfolioResponse, Product, PriceResponse, StockResponse, ApiError } from '../types';

/**
 * Todas as chamadas passam por um proxy de mesma origem (/api/magalu) em vez de
 * baterem direto em https://api.magalu.com. Isso elimina o bloqueio de CORS do
 * navegador. O proxy é servido por:
 *  - dev: o proxy embutido do Vite (vite.config.ts)
 *  - produção: a função serverless em api/magalu/[...path].ts (Vercel)
 * O token continua sendo enviado no header Authorization e apenas repassado.
 */
const API_BASE = '/api/magalu';

// Constrói uma URL absoluta a partir de um caminho relativo da API, permitindo
// usar searchParams normalmente no navegador.
const buildUrl = (path: string): URL => new URL(`${API_BASE}${path}`, window.location.origin);

// Mensagem padrão quando o fetch falha por rede/proxy indisponível.
const CONNECTION_ERROR =
  'Falha na conexão com o proxy da API. Verifique sua conexão de rede ou se o servidor está no ar.';

/**
 * Fetches a single order from the Magalu Seller API.
 */
export const fetchOrder = async (orderCode: string, token: string): Promise<Order> => {
  if (!orderCode) throw new Error('O código do pedido é obrigatório.');
  if (!token) throw new Error('O token de acesso é obrigatório.');

  const url = `${API_BASE}/seller/v1/orders/${orderCode}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Não autorizado (401). Verifique se seu Token está correto.');
      }
      if (response.status === 404) {
        throw new Error('Pedido não encontrado (404). Verifique o código.');
      }
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as Order;
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error(CONNECTION_ERROR);
    }
    throw error;
  }
};

/**
 * Fetches a list of orders from the Magalu Seller API with pagination.
 */
export const fetchOrdersList = async (token: string, offset: number = 0, limit: number = 20): Promise<OrdersListResponse> => {
  if (!token) throw new Error('O token de acesso é obrigatório.');

  // Construct URL with query parameters
  const url = buildUrl('/seller/v1/orders');
  url.searchParams.append('_offset', offset.toString());
  url.searchParams.append('limit', limit.toString());

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Não autorizado (401). Verifique se seu Token está correto.');
      }
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as OrdersListResponse;
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error(CONNECTION_ERROR);
    }
    throw error;
  }
};

/**
 * Fetches a list of products (Portfolio SKUs) from the Magalu Seller API.
 */
export const fetchPortfolio = async (token: string, offset: number = 0, limit: number = 20): Promise<PortfolioResponse> => {
  if (!token) throw new Error('O token de acesso é obrigatório.');

  const url = buildUrl('/seller/v1/portfolios/skus');
  url.searchParams.append('_offset', offset.toString());
  url.searchParams.append('_limit', limit.toString()); // Note: _limit vs limit in orders API might differ, sticking to user docs which says _limit for portfolios

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Não autorizado (401). Verifique se seu Token está correto.');
      }
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as PortfolioResponse;
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error(CONNECTION_ERROR);
    }
    throw error;
  }
};

/**
 * Fetches a single product (SKU) from the Magalu Seller API.
 */
export const fetchProduct = async (sku: string, token: string): Promise<Product> => {
  if (!sku) throw new Error('O SKU é obrigatório.');
  if (!token) throw new Error('O token de acesso é obrigatório.');

  // URL encode the SKU as it might contain special characters
  const encodedSku = encodeURIComponent(sku);
  const url = `${API_BASE}/seller/v1/portfolios/skus/${encodedSku}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Não autorizado (401). Verifique se seu Token está correto.');
      }
      if (response.status === 404) {
        throw new Error('Produto não encontrado (404). Verifique o SKU.');
      }
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as Product;
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error(CONNECTION_ERROR);
    }
    throw error;
  }
};

/**
 * Fetches the price of a single product (SKU).
 */
export const fetchProductPrice = async (sku: string, token: string): Promise<PriceResponse> => {
  if (!sku) throw new Error('O SKU é obrigatório.');
  if (!token) throw new Error('O token de acesso é obrigatório.');

  const encodedSku = encodeURIComponent(sku);
  // Path param para preço de um único SKU: /seller/v1/portfolios/prices/:sku
  const url = `${API_BASE}/seller/v1/portfolios/prices/${encodedSku}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    // Price API usually returns 200 with empty list if not found, or 404.
    if (!response.ok) {
       // If 404 on price, we just return empty results rather than throwing, to allow product display
       if (response.status === 404) {
         return { results: [], meta: { page: { count: 0, limit: 0, offset: 0, max_limit: 0 }, links: { self: '' } } };
       }
       throw new Error(`Erro Preço: ${response.status}`);
    }

    const data = await response.json();
    return data as PriceResponse;
  } catch (error: any) {
    console.error("Failed to fetch price", error);
    // Return empty structure on error to not block UI
    return { results: [], meta: { page: { count: 0, limit: 0, offset: 0, max_limit: 0 }, links: { self: '' } } };
  }
};

/**
 * Fetches the stock of a single product (SKU).
 */
export const fetchProductStock = async (sku: string, token: string): Promise<StockResponse> => {
  if (!sku) throw new Error('O SKU é obrigatório.');
  if (!token) throw new Error('O token de acesso é obrigatório.');

  const encodedSku = encodeURIComponent(sku);
  const url = `${API_BASE}/seller/v1/portfolios/stocks/${encodedSku}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
       // If 404 on stock, return empty results
       if (response.status === 404) {
         return { results: [], meta: { page: { count: 0, limit: 0, offset: 0, max_limit: 0 }, links: { self: '' } } };
       }
       throw new Error(`Erro Estoque: ${response.status}`);
    }

    const data = await response.json();
    return data as StockResponse;
  } catch (error: any) {
    console.error("Failed to fetch stock", error);
    // Return empty structure on error to not block UI
    return { results: [], meta: { page: { count: 0, limit: 0, offset: 0, max_limit: 0 }, links: { self: '' } } };
  }
};