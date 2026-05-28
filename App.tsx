import React, { useState, useEffect } from 'react';
import { InputSection } from './components/InputSection';
import { OrderVisualizer } from './components/OrderVisualizer';
import { RawJsonViewer } from './components/RawJsonViewer';
import { OrdersList } from './components/OrdersList';
import { ProductsList } from './components/ProductsList';
import { ProductVisualizer } from './components/ProductVisualizer';
import { Toast } from './components/Toast';
import { fetchOrder, fetchOrdersList, fetchPortfolio, fetchProduct, fetchProductPrice, fetchProductStock } from './services/magaluService';
import { Order, OrdersListResponse, PortfolioResponse, Product, PriceDetail, StockDetail } from './types';
import { ShoppingBag, AlertCircle, Eye, EyeOff, List, Search, Key, Package, RefreshCw, Box, ExternalLink, Download, X, CheckCircle } from 'lucide-react';

type Tab = 'search' | 'list' | 'products';

interface SearchedProductData {
  product: Product;
  price?: PriceDetail;
  stock?: StockDetail;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  
  // Global State
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [toastMessage, setToastMessage] = useState('');

  // Search Mode State (Orders)
  // Now supports multiple orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // List Mode State
  const [listData, setListData] = useState<OrdersListResponse | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [viewingOrderFromList, setViewingOrderFromList] = useState<Order | null>(null);

  // Products Mode State
  const [productsData, setProductsData] = useState<PortfolioResponse | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsLimit, setProductsLimit] = useState(20);
  const [fetchAllProgress, setFetchAllProgress] = useState<{current: number} | null>(null);
  
  // Product Search State
  const [productSearchSku, setProductSearchSku] = useState('');
  // Now supports multiple products
  const [searchedProducts, setSearchedProducts] = useState<SearchedProductData[]>([]);
  const [singleProductLoading, setSingleProductLoading] = useState(false);
  const [singleProductError, setSingleProductError] = useState<string | null>(null);

  const [showRawJson, setShowRawJson] = useState(false);

  // Sync token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('magalu_api_token');
    if (savedToken) setToken(savedToken);
  }, []);

  const handleTokenError = (err: any) => {
    if (err?.message && (err.message.includes('401') || err.message.includes('403'))) {
      setTokenStatus('invalid');
    }
  };

  // --- ORDER SEARCH HANDLER ---
  const handleSearch = async (inputString: string) => {
    if (!token) {
      setError('Por favor, insira o Token Magalu no topo da página.');
      return;
    }
    setLoading(true);
    setError(null);
    setOrders([]);
    setShowRawJson(false);

    // Split input by comma and cleanup
    const orderCodes = inputString.split(',').map(s => s.trim()).filter(Boolean);

    if (orderCodes.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Use Promise.allSettled to allow some requests to fail while others succeed
      const results = await Promise.allSettled(
        orderCodes.map(code => fetchOrder(code, token))
      );

      const successfulOrders: Order[] = [];
      const errors: string[] = [];
      let hadAuthError = false;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulOrders.push(result.value);
        } else {
          const errMsg = result.reason?.message || 'Erro desconhecido';
          errors.push(`Pedido ${orderCodes[index]}: ${errMsg}`);
          if (errMsg.includes('401') || errMsg.includes('403')) hadAuthError = true;
        }
      });

      setOrders(successfulOrders);

      if (hadAuthError) {
        setTokenStatus('invalid');
      } else if (successfulOrders.length > 0) {
        setTokenStatus('valid');
      }

      if (errors.length > 0) {
        setError(errors.join(' | '));
      } else if (successfulOrders.length === 0) {
         setError('Nenhum pedido encontrado.');
      }

    } catch (err: any) {
      handleTokenError(err);
      setError(err.message || 'Ocorreu um erro fatal ao buscar os pedidos.');
    } finally {
      setLoading(false);
    }
  };

  // --- LIST ORDERS HANDLER ---
  const handleListFetch = async (offset: number = 0) => {
    if (!token) {
      setListError('Por favor, insira o Token Magalu no topo da página.');
      return;
    }
    
    setListLoading(true);
    setListError(null);
    setViewingOrderFromList(null);

    try {
      const data = await fetchOrdersList(token, offset);
      setListData(data);
      setTokenStatus('valid');
    } catch (err: any) {
      handleTokenError(err);
      setListError(err.message || 'Erro ao buscar lista de pedidos.');
    } finally {
      setListLoading(false);
    }
  };

  // --- PRODUCT LIST HANDLER ---
  const handleProductsFetch = async (offset: number = 0, newLimit?: number) => {
    if (!token) {
      setProductsError('Por favor, insira o Token Magalu no topo da página.');
      return;
    }

    const limitToUse = newLimit || Math.min(100, productsLimit); // cap limit for standard fetch
    if (newLimit && newLimit !== productsLimit) {
      setProductsLimit(newLimit);
    }

    setProductsLoading(true);
    setProductsError(null);
    setSearchedProducts([]); // Clear single search when listing

    try {
      const data = await fetchPortfolio(token, offset, limitToUse);
      setProductsData(data);
      setTokenStatus('valid');
    } catch (err: any) {
      handleTokenError(err);
      setProductsError(err.message || 'Erro ao buscar lista de produtos.');
    } finally {
      setProductsLoading(false);
    }
  };

  // --- PRODUCT FETCH ALL HANDLER ---
  const handleProductsFetchAll = async () => {
    if (!token) {
      setProductsError('Por favor, insira o Token Magalu no topo da página.');
      return;
    }

    setProductsLoading(true);
    setProductsError(null);
    setSearchedProducts([]); // Clear single search
    setFetchAllProgress({ current: 0 });

    try {
      let offset = 0;
      const limit = 100;
      let allProducts: Product[] = [];
      let hasNext = true;

      while (hasNext) {
        try {
          const data = await fetchPortfolio(token, offset, limit);
          if (data && data.results && data.results.length > 0) {
            allProducts = [...allProducts, ...data.results];
            setFetchAllProgress({ current: allProducts.length });
            
            if (data.meta?.links?.next) {
              offset += limit;
            } else {
              hasNext = false;
            }
          } else {
            hasNext = false;
          }
        } catch (err: any) {
          // Some APIs return 404 when offset is beyond total items instead of an empty list
          if (err.message && err.message.includes('404') && allProducts.length > 0) {
            hasNext = false;
          } else {
            throw err;
          }
        }
      }

      setProductsData({
        results: allProducts,
        meta: {
          page: { limit: allProducts.length, offset: 0, count: allProducts.length, max_limit: limit },
          // nullify links so pagination visually stops
          links: { previous: null as any, next: null as any, self: '' }
        }
      });
      setProductsLimit(allProducts.length);
      setTokenStatus('valid');
    } catch (err: any) {
      handleTokenError(err);
      setProductsError(err.message || 'Erro ao buscar todos os produtos.');
    } finally {
      setProductsLoading(false);
      setFetchAllProgress(null);
    }
  };

  // --- SINGLE (OR MULTI) PRODUCT SEARCH HANDLER ---
  const handleProductSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setProductsError('Por favor, insira o Token Magalu no topo da página.');
      return;
    }
    if (!productSearchSku.trim()) return;

    setSingleProductLoading(true);
    setProductsError(null);
    setSingleProductError(null);
    setSearchedProducts([]);
    setShowRawJson(false);

    const skus = productSearchSku.split(',').map(s => s.trim()).filter(Boolean);

    if (skus.length === 0) {
      setSingleProductLoading(false);
      return;
    }

    try {
      // Parallel fetch for multiple SKUs
      const results = await Promise.allSettled(
        skus.map(async (sku) => {
          // Inner parallel fetch for product details
          const [product, priceResponse, stockResponse] = await Promise.all([
             fetchProduct(sku, token),
             fetchProductPrice(sku, token),
             fetchProductStock(sku, token)
          ]);

          let price: PriceDetail | undefined = undefined;
          if (priceResponse && priceResponse.results && priceResponse.results.length > 0) {
            price = priceResponse.results[0];
          }

          let stock: StockDetail | undefined = undefined;
          if (stockResponse && stockResponse.results && stockResponse.results.length > 0) {
             stock = stockResponse.results.find(s => s.type === 'AVAILABLE') || stockResponse.results[0];
          }

          return { product, price, stock };
        })
      );

      const successfulProducts: SearchedProductData[] = [];
      const errors: string[] = [];
      let hadAuthError = false;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulProducts.push(result.value);
        } else {
          const errMsg = result.reason?.message || 'Erro ao carregar';
          errors.push(`SKU ${skus[index]}: ${errMsg}`);
          if (errMsg.includes('401') || errMsg.includes('403')) hadAuthError = true;
        }
      });

      setSearchedProducts(successfulProducts);

      if (hadAuthError) {
        setTokenStatus('invalid');
      } else if (successfulProducts.length > 0) {
        setTokenStatus('valid');
      }

      if (errors.length > 0) {
        setSingleProductError(errors.join(' | '));
      } else if (successfulProducts.length === 0) {
        setSingleProductError('Nenhum produto encontrado.');
      }

    } catch (err: any) {
      handleTokenError(err);
      setSingleProductError(err.message || 'Erro fatal ao buscar produtos.');
    } finally {
      setSingleProductLoading(false);
    }
  };

  const handleProductLimitChange = (newLimit: number) => {
    handleProductsFetch(0, newLimit);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setError(null);
    setListError(null);
    setProductsError(null);
    setSingleProductError(null);
    setShowRawJson(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Navbar / Header */}
      <header className="bg-magalu-blue shadow-lg z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg text-magalu-blue shadow-sm">
                <ShoppingBag size={24} strokeWidth={2.5} />
              </div>
              <div>
                 <h1 className="text-xl font-bold text-white tracking-tight">Magalu API Explorer</h1>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 bg-blue-800/30 rounded-lg overflow-x-auto">
              <button
                onClick={() => handleTabChange('search')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none ${
                  activeTab === 'search' 
                    ? 'bg-white text-magalu-blue shadow-sm' 
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Search size={16} /> Buscar Pedido
              </button>
              <button
                onClick={() => handleTabChange('list')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none ${
                  activeTab === 'list' 
                    ? 'bg-white text-magalu-blue shadow-sm' 
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <List size={16} /> Listar Pedidos
              </button>
              <button
                onClick={() => handleTabChange('products')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none ${
                  activeTab === 'products' 
                    ? 'bg-white text-magalu-blue shadow-sm' 
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Package size={16} /> Produtos
              </button>
            </div>
          </div>
          
          {/* Global Token Input */}
          <div className="space-y-2">
            <div className="relative flex items-center">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Key size={16} className="text-magalu-blue" />
               </div>
               <input 
                 type={showToken ? "text" : "password"}
                 value={token}
                 onChange={(e) => {
                   setToken(e.target.value);
                   localStorage.setItem('magalu_api_token', e.target.value);
                   if (tokenStatus === 'invalid') setTokenStatus('idle');
                 }}
                 placeholder="Insira seu Token Magalu (Bearer) aqui para habilitar as consultas..."
                 className="w-full pl-10 pr-[140px] py-2.5 bg-white border-none rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-4 focus:ring-magalu-yellow/50 transition-all shadow-sm"
               />
               <div className="absolute right-1 flex items-center gap-1">
                  {token && (
                    <button 
                      onClick={() => { setToken(''); localStorage.removeItem('magalu_api_token'); setTokenStatus('idle'); }} 
                      className="px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none"
                      title="Limpar"
                      aria-label="Limpar token"
                    >
                      <X size={14} /> Limpar
                    </button>
                  )}
                 <button 
                   onClick={() => setShowToken(!showToken)} 
                   className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none"
                   title={showToken ? "Ocultar token" : "Mostrar token"}
                   aria-label={showToken ? "Ocultar token" : "Mostrar token"}
                 >
                   {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                 </button>
               </div>
            </div>
            
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-blue-100/80 font-medium">Armazenado apenas neste navegador</span>
              {tokenStatus !== 'idle' && token && (
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold shadow-sm ${tokenStatus === 'valid' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                   {tokenStatus === 'valid' ? (
                     <><CheckCircle size={12} /> Token ativo</>
                   ) : (
                     <><AlertCircle size={12} /> Token inválido</>
                   )}
                </div>
              )}
            </div>
          </div>

        </div>
        
        {/* Decorative bottom rainbow line often seen in Magalu branding */}
        <div className="h-1 w-full bg-gradient-to-r from-magalu-yellow via-magalu-blue to-magalu-green"></div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* --- TAB: SEARCH ORDERS --- */}
        {activeTab === 'search' && (
          <div className="animate-fade-in">
            <InputSection onSearch={handleSearch} loading={loading} />

            {error && (
              <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
                <AlertCircle className="text-red-500 mt-0.5" size={20} />
                <div>
                  <h3 className="text-red-800 font-medium">Erro na consulta</h3>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {orders.length > 0 && (
              <div className="animate-fade-in-up space-y-12">
                <div className="flex justify-end mb-4">
                   <button 
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-2 px-3 py-1 rounded-full border border-transparent hover:border-gray-200 transition-all"
                   >
                     {showRawJson ? <EyeOff size={14} /> : <Eye size={14} />}
                     {showRawJson ? 'Ocultar JSON Bruto' : 'Ver JSON Bruto'}
                   </button>
                </div>

                {orders.map((orderItem, idx) => (
                  <div key={orderItem.id} className="relative">
                    {idx > 0 && (
                      <div className="absolute -top-6 left-0 right-0 h-px bg-gray-300 border-t border-dashed border-gray-400"></div>
                    )}
                    <OrderVisualizer order={orderItem} token={token} />
                    {showRawJson && <RawJsonViewer data={orderItem} onShowToast={setToastMessage} />}
                  </div>
                ))}
              </div>
            )}

            {orders.length === 0 && !loading && !error && (
                <div className="text-center py-20 opacity-50">
                    <div className="inline-block p-6 bg-white shadow-sm border border-gray-100 rounded-full mb-4">
                        <ShoppingBag size={48} className="text-magalu-blue" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-600">Nenhum pedido carregado</h3>
                    <p className="text-gray-500">Insira o(s) Código(s) do Pedido abaixo para visualizar.</p>
                </div>
            )}
          </div>
        )}

        {/* --- TAB: LIST ORDERS --- */}
        {activeTab === 'list' && (
          <div className="animate-fade-in">
            
            {/* Controls */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100 flex justify-end">
               <button
                  onClick={() => handleListFetch(0)}
                  disabled={listLoading || !token}
                  className="px-6 py-2 bg-magalu-blue text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none"
               >
                 {listLoading ? <RefreshCw size={18} className="animate-spin" /> : <List size={18} />}
                 {listLoading ? 'Carregando...' : 'Atualizar Lista'}
               </button>
            </div>

            {listError && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
                <AlertCircle className="text-red-500 mt-0.5" size={20} />
                <div>
                  <h3 className="text-red-800 font-medium">Erro ao listar</h3>
                  <p className="text-red-700 text-sm mt-1">{listError}</p>
                </div>
              </div>
            )}

            {viewingOrderFromList ? (
               // Detail View from List
               <div className="animate-fade-in-up">
                  <OrderVisualizer 
                    order={viewingOrderFromList} 
                    token={token}
                    onBack={() => setViewingOrderFromList(null)} 
                  />
                  <div className="mt-8">
                    <RawJsonViewer data={viewingOrderFromList} onShowToast={setToastMessage} />
                  </div>
               </div>
            ) : (
               // List View
               <>
                 {listData ? (
                   <OrdersList 
                      orders={listData.results} 
                      meta={listData.meta} 
                      onPageChange={handleListFetch}
                      onViewOrder={setViewingOrderFromList}
                      loading={listLoading}
                   />
                 ) : (
                   !listLoading && !listError && (
                    <div className="text-center py-20 opacity-50">
                        <div className="inline-block p-6 bg-white shadow-sm border border-gray-100 rounded-full mb-4">
                            <List size={48} className="text-magalu-blue" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-600">Lista vazia</h3>
                        <p className="text-gray-500">
                          {!token ? "Insira seu Token no topo da página e clique em Atualizar." : "Clique em Atualizar Lista para carregar."}
                        </p>
                    </div>
                   )
                 )}
               </>
            )}
          </div>
        )}

        {/* --- TAB: PRODUCTS (PORTFOLIO) --- */}
        {activeTab === 'products' && (
          <div className="animate-fade-in">
             
             {/* Product Search & List Controls */}
             <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
               <div className="flex flex-col md:flex-row items-end gap-4 justify-between">
                  
                  {/* Search Form */}
                  <form onSubmit={handleProductSearch} className="w-full md:flex-1">
                    <label htmlFor="skuSearch" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                       <Box size={16} /> Pesquisar SKU(s)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        id="skuSearch"
                        type="text" 
                        value={productSearchSku}
                        onChange={(e) => setProductSearchSku(e.target.value)}
                        placeholder="Ex: SKU123, SKU456..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-magalu-blue focus:border-magalu-blue"
                      />
                      <button 
                        type="submit"
                        disabled={singleProductLoading || !token}
                        className="px-4 py-2 bg-magalu-blue text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 font-medium flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none"
                      >
                         {singleProductLoading ? <RefreshCw className="animate-spin" size={18}/> : <Search size={18} />}
                         Buscar
                      </button>
                    </div>
                     <p className="text-xs text-gray-400 mt-1">
                        Separe múltiplos SKUs por vírgula.
                     </p>
                  </form>

                  <div className="hidden md:block w-px h-12 bg-gray-200 mx-2"></div>

                  {/* List Button */}
                  <div className="w-full md:w-auto">
                     <label className="block text-sm font-medium text-gray-700 mb-1 invisible">Ação</label>
                     <div className="flex flex-col sm:flex-row gap-2">
                       <button
                          onClick={() => handleProductsFetch(0)}
                          disabled={productsLoading || !token}
                          className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium flex items-center justify-center gap-2 flex-1 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none"
                       >
                         {productsLoading && !fetchAllProgress ? <RefreshCw size={18} className="animate-spin" /> : <List size={18} />}
                         Listar Página
                       </button>
                       <button
                          onClick={handleProductsFetchAll}
                          disabled={productsLoading || !token}
                          className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 font-medium flex items-center justify-center gap-2 flex-1 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none"
                          title="Faz requisições até retornar todos os produtos"
                       >
                         {productsLoading && fetchAllProgress ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                         {fetchAllProgress ? `Carregando (${fetchAllProgress.current})...` : 'Carregar Todos'}
                       </button>
                     </div>
                  </div>
               </div>
             </div>

            {/* Error Messages */}
            {(productsError || singleProductError) && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
                <AlertCircle className="text-red-500 mt-0.5" size={20} />
                <div>
                  <h3 className="text-red-800 font-medium">Erro</h3>
                  <p className="text-red-700 text-sm mt-1">{productsError || singleProductError}</p>
                </div>
              </div>
            )}

            {/* View Logic: Searched Products OR List */}
            {searchedProducts.length > 0 ? (
              <div className="animate-fade-in-up space-y-12">
                 <div className="flex justify-end mb-2">
                     <button 
                       onClick={() => setShowRawJson(!showRawJson)}
                       className="text-xs text-gray-500 hover:text-blue-600 underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none rounded"
                     >
                       {showRawJson ? <EyeOff size={12} /> : <Eye size={12} />}
                       {showRawJson ? 'Ocultar JSON' : 'Ver JSON Bruto'}
                     </button>
                 </div>
                 
                 {searchedProducts.map((item, idx) => (
                    <div key={item.product.sku} className="relative">
                        {idx > 0 && (
                          <div className="absolute -top-6 left-0 right-0 h-px bg-gray-300 border-t border-dashed border-gray-400"></div>
                        )}
                        <ProductVisualizer 
                            product={item.product} 
                            price={item.price}
                            stock={item.stock}
                            onBack={() => setSearchedProducts([])} 
                        />
                        {showRawJson && (
                            <div className="mt-4 space-y-4">
                                <div>
                                <p className="text-xs font-bold text-gray-500 mb-1">Produto ({item.product.sku})</p>
                                <RawJsonViewer data={item.product} onShowToast={setToastMessage} />
                                </div>
                                {item.price && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">Preço</p>
                                    <RawJsonViewer data={item.price} onShowToast={setToastMessage} />
                                </div>
                                )}
                                {item.stock && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">Estoque</p>
                                    <RawJsonViewer data={item.stock} onShowToast={setToastMessage} />
                                </div>
                                )}
                            </div>
                        )}
                    </div>
                 ))}
              </div>
            ) : productsData ? (
              <>
                <ProductsList 
                  products={productsData.results}
                  meta={productsData.meta}
                  onPageChange={(offset) => handleProductsFetch(offset)}
                  loading={productsLoading}
                  limit={productsLimit}
                  onLimitChange={handleProductLimitChange}
                  token={token}
                  onShowToast={setToastMessage}
                />
                <div className="mt-8">
                  <div className="flex justify-end mb-2">
                    <button 
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-xs text-gray-500 hover:text-blue-600 underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none rounded"
                    >
                      {showRawJson ? 'Ocultar JSON' : 'Ver JSON Bruto'}
                    </button>
                  </div>
                  {showRawJson && <RawJsonViewer data={productsData} onShowToast={setToastMessage} />}
                </div>
              </>
            ) : (
              !productsLoading && !productsError && !singleProductLoading && !singleProductError && (
                <div className="text-center py-20 opacity-50">
                    <div className="inline-block p-6 bg-white shadow-sm border border-gray-100 rounded-full mb-4">
                        <Package size={48} className="text-magalu-blue" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-600">Área de Produtos</h3>
                    <p className="text-gray-500">
                      Pesquise SKU(s) acima ou clique em "Listar Todos".
                    </p>
                </div>
              )
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-white border-t border-gray-200 py-3 px-4 md:px-8 text-sm text-gray-500 flex flex-col md:flex-row justify-between items-center gap-3 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="font-medium flex items-center gap-2">
           Magalu API Explorer <span className="hidden sm:inline">— Utilitário Local</span>
        </div>
        
        <div className="flex items-center gap-4 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:block">
                Navegar para:
            </span>
            
            <a 
                href="https://ml-api-explorer.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-yellow-600 hover:text-yellow-700 font-semibold transition-colors group focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none rounded-sm px-1 -mx-1"
                title="Ir para Mercado Livre API Explorer"
            >
                Mercado Livre
                <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </a>

            <div className="w-px h-3 bg-gray-300"></div>

            <a 
                href="https://shopee-api-viewer.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-orange-500 hover:text-orange-600 font-semibold transition-colors group focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-magalu-blue focus-visible:outline-none rounded-sm px-1 -mx-1"
                title="Ir para Shopee API Explorer"
            >
                Shopee
                <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </a>
        </div>
      </footer>
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  );
};

export default App;