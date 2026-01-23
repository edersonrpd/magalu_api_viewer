import React, { useState, useEffect } from 'react';
import { InputSection } from './components/InputSection';
import { OrderVisualizer } from './components/OrderVisualizer';
import { RawJsonViewer } from './components/RawJsonViewer';
import { OrdersList } from './components/OrdersList';
import { ProductsList } from './components/ProductsList';
import { ProductVisualizer } from './components/ProductVisualizer';
import { fetchOrder, fetchOrdersList, fetchPortfolio, fetchProduct, fetchProductPrice, fetchProductStock } from './services/magaluService';
import { Order, OrdersListResponse, PortfolioResponse, Product, PriceDetail, StockDetail } from './types';
import { ShoppingBag, AlertCircle, Eye, EyeOff, List, Search, Key, Package, RefreshCw, Box, ExternalLink } from 'lucide-react';

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

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulOrders.push(result.value);
        } else {
          errors.push(`Pedido ${orderCodes[index]}: ${result.reason?.message || 'Erro desconhecido'}`);
        }
      });

      setOrders(successfulOrders);

      if (errors.length > 0) {
        setError(errors.join(' | '));
      } else if (successfulOrders.length === 0) {
         setError('Nenhum pedido encontrado.');
      }

    } catch (err: any) {
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
    } catch (err: any) {
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

    const limitToUse = newLimit || productsLimit;
    if (newLimit && newLimit !== productsLimit) {
      setProductsLimit(newLimit);
    }

    setProductsLoading(true);
    setProductsError(null);
    setSearchedProducts([]); // Clear single search when listing

    try {
      const data = await fetchPortfolio(token, offset, limitToUse);
      setProductsData(data);
    } catch (err: any) {
      setProductsError(err.message || 'Erro ao buscar lista de produtos.');
    } finally {
      setProductsLoading(false);
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

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulProducts.push(result.value);
        } else {
          errors.push(`SKU ${skus[index]}: ${result.reason?.message || 'Erro ao carregar'}`);
        }
      });

      setSearchedProducts(successfulProducts);

      if (errors.length > 0) {
        setSingleProductError(errors.join(' | '));
      } else if (successfulProducts.length === 0) {
        setSingleProductError('Nenhum produto encontrado.');
      }

    } catch (err: any) {
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
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === 'search' 
                    ? 'bg-white text-magalu-blue shadow-sm' 
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Search size={16} /> Buscar Pedido
              </button>
              <button
                onClick={() => handleTabChange('list')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === 'list' 
                    ? 'bg-white text-magalu-blue shadow-sm' 
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <List size={16} /> Listar Pedidos
              </button>
              <button
                onClick={() => handleTabChange('products')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all whitespace-nowrap ${
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
          <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Key size={16} className="text-magalu-blue" />
             </div>
             <input 
               type="password" 
               value={token}
               onChange={(e) => {
                 setToken(e.target.value);
                 localStorage.setItem('magalu_api_token', e.target.value);
               }}
               placeholder="Insira seu Token Magalu (Bearer) aqui para habilitar as consultas..."
               className="w-full pl-10 pr-4 py-2.5 bg-white border-none rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-4 focus:ring-magalu-yellow/50 transition-all shadow-sm"
             />
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
                    {showRawJson && <RawJsonViewer data={orderItem} />}
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
                    <p className="text-gray-400">Insira o(s) Código(s) do Pedido abaixo para visualizar.</p>
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
                  className="px-6 py-2 bg-magalu-blue text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
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
                    <RawJsonViewer data={viewingOrderFromList} />
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
                        <p className="text-gray-400">
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
                        className="px-4 py-2 bg-magalu-blue text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 font-medium flex items-center gap-2"
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
                     <button
                        onClick={() => handleProductsFetch(0)}
                        disabled={productsLoading || !token}
                        className="w-full px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                     >
                       {productsLoading ? <RefreshCw size={18} className="animate-spin" /> : <List size={18} />}
                       Listar Todos
                     </button>
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
                       className="text-xs text-gray-500 hover:text-blue-600 underline flex items-center gap-1"
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
                                <RawJsonViewer data={item.product} />
                                </div>
                                {item.price && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">Preço</p>
                                    <RawJsonViewer data={item.price} />
                                </div>
                                )}
                                {item.stock && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">Estoque</p>
                                    <RawJsonViewer data={item.stock} />
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
                />
                <div className="mt-8">
                  <div className="flex justify-end mb-2">
                    <button 
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-xs text-gray-500 hover:text-blue-600 underline"
                    >
                      {showRawJson ? 'Ocultar JSON' : 'Ver JSON Bruto'}
                    </button>
                  </div>
                  {showRawJson && <RawJsonViewer data={productsData} />}
                </div>
              </>
            ) : (
              !productsLoading && !productsError && !singleProductLoading && !singleProductError && (
                <div className="text-center py-20 opacity-50">
                    <div className="inline-block p-6 bg-white shadow-sm border border-gray-100 rounded-full mb-4">
                        <Package size={48} className="text-magalu-blue" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-600">Área de Produtos</h3>
                    <p className="text-gray-400">
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
                className="flex items-center gap-1.5 text-yellow-600 hover:text-yellow-700 font-semibold transition-colors group"
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
                className="flex items-center gap-1.5 text-orange-500 hover:text-orange-600 font-semibold transition-colors group"
                title="Ir para Shopee API Explorer"
            >
                Shopee
                <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </a>
        </div>
      </footer>
    </div>
  );
};

export default App;