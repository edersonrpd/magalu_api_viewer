import React, { useState, useEffect } from 'react';
import { Product, PaginationMeta } from '../types';
import { formatDate, getStatusConfig, formatValue } from '../utils';
import { fetchProductPrice, fetchProductStock } from '../services/magaluService';
import { 
  ChevronLeft, ChevronRight, Search, Package, ImageOff, ExternalLink, Download, Loader2
} from 'lucide-react';
import { Tooltip } from 'react-tooltip';

interface ProductsListProps {
  products: Product[];
  meta: PaginationMeta;
  onPageChange: (offset: number) => void;
  loading: boolean;
  limit: number;
  onLimitChange: (limit: number) => void;
  token: string;
  onShowToast?: (message: string) => void;
}

export const ProductsList: React.FC<ProductsListProps> = ({ 
  products, 
  meta, 
  onPageChange, 
  loading,
  limit,
  onLimitChange,
  token,
  onShowToast
}) => {
  const [filter, setFilter] = useState('');

  // Local filtering
  const filteredProducts = products.filter(p => 
    p.sku.toLowerCase().includes(filter.toLowerCase()) || 
    p.title.toLowerCase().includes(filter.toLowerCase())
  );

  // Pagination Logic
  // Using links from meta to determine navigation availability
  // meta.page.offset is the starting index (0, 20, 40...)
  const currentPage = Math.floor(meta.page.offset / limit) + 1;
  const totalItems = meta.page.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const hasNextPage = !!meta.links.next;
  const hasPrevPage = !!meta.links.previous || meta.page.offset > 0;

  const handlePrev = () => {
    if (hasPrevPage) {
      const newOffset = Math.max(0, meta.page.offset - limit);
      onPageChange(newOffset);
    }
  };

  const handleNext = () => {
    if (hasNextPage) {
      const nextOffset = meta.page.offset + limit;
      onPageChange(nextOffset);
    }
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(e.target.value, 10);
    onLimitChange(newLimit);
  };

  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [stocks, setStocks] = useState<Record<string, number | null>>({});

  useEffect(() => {
    const skusToFetch = filteredProducts.map(p => p.sku).filter(s => prices[s] === undefined || stocks[s] === undefined);
    if (skusToFetch.length === 0) return;

    let isMounted = true;
    const fetchBatch = async () => {
      const batchSize = 10;
      for (let i = 0; i < skusToFetch.length; i += batchSize) {
        if (!isMounted) break;
        const batch = skusToFetch.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async sku => {
            try {
              const [priceRes, stockRes] = await Promise.allSettled([
                fetchProductPrice(sku, token),
                fetchProductStock(sku, token)
              ]);
              const price = priceRes.status === 'fulfilled' ? (priceRes.value.results?.[0]?.price ?? null) : null;
              
              let stock = null;
              if (stockRes.status === 'fulfilled' && stockRes.value.results?.length > 0) {
                 const availableStock = stockRes.value.results.find((s: any) => s.type === 'AVAILABLE');
                 stock = availableStock ? availableStock.quantity : stockRes.value.results[0].quantity;
              }

              return { sku, price, stock };
            } catch {
              return { sku, price: null, stock: null };
            }
          })
        );
        
        if (isMounted) {
          setPrices(prev => {
            const next = { ...prev };
            results.forEach(r => {
              if (r.status === 'fulfilled') next[r.value.sku] = r.value.price;
            });
            return next;
          });
          setStocks(prev => {
            const next = { ...prev };
            results.forEach(r => {
              if (r.status === 'fulfilled') next[r.value.sku] = r.value.stock;
            });
            return next;
          });
        }
      }
    };
    fetchBatch();
    return () => { isMounted = false; };
  }, [filteredProducts, token, prices, stocks]);

  const handleExportCSV = () => {
    const headers = ['Produto', 'SKU', 'EAN', 'Marca', 'Status', 'Condição', 'Ativo', 'Preço', 'Estoque', 'Altura', 'Largura', 'Comprimento', 'Peso', 'Data Criação'];
    const csvRows = [];
    csvRows.push(headers.join(';'));

    filteredProducts.forEach(product => {
      const ean = product.identifiers?.find((i: any) => i.type?.toLowerCase() === 'ean')?.value || '';
      let formattedPrice = '';
      if (prices[product.sku] !== undefined && prices[product.sku] !== null) {
         formattedPrice = (Number(prices[product.sku]) / 100).toFixed(2).replace('.', ',');
      }

      const stockVal = stocks[product.sku] !== undefined && stocks[product.sku] !== null ? stocks[product.sku] : '';

      const dims = product.dimensions || [];
      const pDim = dims.find((d: any) => d.name === 'product') || dims[0];
      const altura = pDim?.height ? `${pDim.height.value} ${pDim.height.unit}` : '';
      const largura = pDim?.width ? `${pDim.width.value} ${pDim.width.unit}` : '';
      const comp = pDim?.length ? `${pDim.length.value} ${pDim.length.unit}` : '';
      const peso = pDim?.weight ? `${pDim.weight.value} ${pDim.weight.unit}` : '';

      const row = [
        `"${product.title?.replace(/"/g, '""') || ''}"`,
        `"${product.sku}"`,
        `"${ean}"`,
        `"${product.brand}"`,
        `"${product.status}"`,
        `"${product.condition}"`,
        `"${product.active ? 'Sim' : 'Não'}"`,
        `"${formattedPrice}"`,
        `"${stockVal}"`,
        `"${altura}"`,
        `"${largura}"`,
        `"${comp}"`,
        `"${peso}"`,
        `"${formatDate(product.created_at)}"`
      ];
      csvRows.push(row.join(';'));
    });

    const csvString = '\uFEFF' + csvRows.join('\n'); // Adding BOM for Excel UTF-8 display
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `produtos_${new Date().getTime()}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast(`Planilha exportada (${filteredProducts.length} itens)`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Controls: Search & Summary */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Filtrar por SKU ou Título nesta página..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full sm:w-80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
             <span className="hidden sm:inline">Itens:</span>
             <select 
              value={limit > 100 ? limit : limit} 
              onChange={handleLimitChange}
              disabled={loading || !meta.links.next && !meta.links.previous && products.length > 100}
              className="border-none bg-transparent text-sm font-medium focus:ring-0 cursor-pointer disabled:opacity-50"
             >
               <option value={10}>10</option>
               <option value={20}>20</option>
               <option value={50}>50</option>
               <option value={100}>100</option>
               {limit > 100 && <option value={limit}>Todos ({limit})</option>}
             </select>
          </div>

          <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm whitespace-nowrap">
            {(!meta.links.next && !meta.links.previous && products.length > 100) ? (
              <>Mostrando <b>{filteredProducts.length}</b> de <b>{products.length}</b> itens</>
            ) : (
              <>Exibindo <b>{products.length > 0 ? meta.page.offset + 1 : 0}</b> - <b>{meta.page.offset + products.length}</b> itens</>
            )}
          </div>
          
          <button 
            onClick={handleExportCSV}
            disabled={products.length === 0}
            className="flex items-center gap-2 text-sm text-gray-700 bg-white hover:bg-gray-50 px-4 py-2 rounded-lg border border-gray-300 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            title="Exportar dados para Excel (.csv)"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar Planilha</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3 w-20">Img</th>
                <th className="px-6 py-3">Produto</th>
                <th className="px-6 py-3">Marca</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Preço</th>
                <th className="px-6 py-3 text-right">Estoque</th>
                <th className="px-6 py-3 text-right">Data Criação</th>
                <th className="px-6 py-3 text-center">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 w-10 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-24 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const status = getStatusConfig(product.status);
                  const mainImage = product.images?.[0]?.reference;
                  const marketplaceUrl = product.url_marketplace?.find(u => u.channel === 'magazineluiza')?.url;

                  return (
                    <tr 
                      key={product.sku} 
                      className="hover:bg-gray-50 transition-colors group"
                      data-tooltip-id="product-tooltip"
                      data-tooltip-html={`
                        <div class="max-w-xs">
                          <p class="font-bold border-b border-gray-500 pb-1 mb-1">${product.title}</p>
                          <p class="text-xs">SKU: ${product.sku}</p>
                          <p class="text-xs">Condição: ${product.condition}</p>
                        </div>
                      `}
                    >
                      <td className="px-6 py-3">
                        <div className="w-12 h-12 bg-white border border-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                          {mainImage ? (
                            <img src={mainImage} alt={product.sku} className="w-full h-full object-contain" />
                          ) : (
                            <ImageOff size={20} className="text-gray-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{product.title}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">SKU: {product.sku}</p>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {product.brand}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.style}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-gray-900 font-medium whitespace-nowrap">
                        {prices[product.sku] === undefined ? (
                          <Loader2 size={14} className="animate-spin inline-block text-gray-400" />
                        ) : prices[product.sku] !== null ? (
                          formatValue(prices[product.sku] as number, 100)
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-gray-900 font-medium">
                        {stocks[product.sku] === undefined ? (
                          <Loader2 size={14} className="animate-spin inline-block text-gray-400" />
                        ) : stocks[product.sku] !== null ? (
                          stocks[product.sku]
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-gray-600 font-mono">
                        {formatDate(product.created_at)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {marketplaceUrl ? (
                          <a 
                            href={marketplaceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                            title="Ver no Magalu"
                            aria-label="Ver produto no Magalu"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={18} />
                          </a>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={32} className="opacity-50" />
                      <p>Nenhum produto encontrado nesta página.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Pagination Controls */}
      {(!(!meta.links.next && !meta.links.previous && products.length > 100)) && (
      <div className="bg-white px-6 py-4 border border-gray-200 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
         <div className="text-sm text-gray-500 font-medium">
            Página {currentPage} {hasNextPage ? '' : '(Última)'}
         </div>

         <div className="flex items-center gap-2">
            <button 
              onClick={handlePrev}
              disabled={!hasPrevPage || loading}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:outline-none
                ${!hasPrevPage || loading
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed border border-gray-100'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm'
                }
              `}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} /> Anterior
            </button>

            <button 
              onClick={handleNext}
              disabled={!hasNextPage || loading}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:outline-none
                ${!hasNextPage || loading
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed border border-gray-100'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm border border-blue-600'
                }
              `}
              aria-label="Próxima página"
            >
              Próxima <ChevronRight size={16} />
            </button>
         </div>
      </div>
      )}

      <Tooltip 
        id="product-tooltip" 
        style={{ 
          backgroundColor: "#1f2937", 
          color: "#fff", 
          padding: "12px", 
          borderRadius: "8px", 
          zIndex: 50,
          opacity: 1
        }} 
        place="top"
        delayShow={500}
      />
    </div>
  );
};