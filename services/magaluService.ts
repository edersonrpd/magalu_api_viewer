import { Order, OrdersListResponse, PortfolioResponse, Product, PriceResponse, StockResponse, ApiError } from '../types';

/**
 * Fetches a single order from the Magalu Seller API.
 */
export const fetchOrder = async (orderCode: string, token: string): Promise<Order> => {
  if (!orderCode) throw new Error('O código do pedido é obrigatório.');
  if (!token) throw new Error('O token de acesso é obrigatório.');

  const url = `https://api.magalu.com/seller/v1/orders/${orderCode}`;

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
      throw new Error('Falha na conexão. Isso pode ser um bloqueio de CORS. Tente usar uma extensão de navegador para desabilitar CORS para testes ou verifique sua conexão.');
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
  const url = new URL('https://api.magalu.com/seller/v1/orders');
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
      throw new Error('Falha na conexão. Isso pode ser um bloqueio de CORS. Tente usar uma extensão de navegador para desabilitar CORS para testes ou verifique sua conexão.');
    }
    throw error;
  }
};

/**
 * Fetches a list of products (Portfolio SKUs) from the Magalu Seller API.
 */
export const fetchPortfolio = async (token: string, offset: number = 0, limit: number = 20): Promise<PortfolioResponse> => {
  if (!token) throw new Error('O token de acesso é obrigatório.');

  const url = new URL('https://api.magalu.com/seller/v1/portfolios/skus');
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
      throw new Error('Falha na conexão. Isso pode ser um bloqueio de CORS.');
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
  const url = `https://api.magalu.com/seller/v1/portfolios/skus/${encodedSku}`;

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
      throw new Error('Falha na conexão. Isso pode ser um bloqueio de CORS.');
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
  // Using query params for single sku if following the list pattern, OR path param if available.
  // The user prompt showed https://api.magalu.com/seller/v1/portfolios/prices/:sku
  const url = `https://api.magalu.com/seller/v1/portfolios/prices/${encodedSku}`;

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
  const url = `https://api.magalu.com/seller/v1/portfolios/stocks/${encodedSku}`;

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