import React, { useState, useEffect } from 'react';
import { Product, PriceDetail, StockDetail } from '../types';
import { getStatusConfig, formatDate, formatValue } from '../utils';
import { 
  Box, Ruler, Tag, Calendar, Globe, ExternalLink, Barcode, Layers, ImageOff, TrendingDown, Clock, PackageCheck
} from 'lucide-react';

interface ProductVisualizerProps {
  product: Product;
  price?: PriceDetail;
  stock?: StockDetail;
  onBack?: () => void;
}

export const ProductVisualizer: React.FC<ProductVisualizerProps> = ({ product, price, stock, onBack }) => {
  const status = getStatusConfig(product.status);
  const marketplaceUrl = product.url_marketplace?.find(u => u.channel === 'magazineluiza')?.url;
  
  // Find EAN/GTIN if available
  const ean = product.identifiers?.find(id => id.type === 'EAN' || id.type === 'GTIN')?.value;
  
  // Extract dimensions (usually the first element in the array for the product itself)
  const dims = product.dimensions?.[0];

  // Image Gallery State
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    if (product.images && product.images.length > 0) {
      setActiveImage(product.images[0].reference);
    } else {
      setActiveImage(null);
    }
  }, [product]);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {onBack && (
        <button 
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline mb-2 flex items-center gap-1"
        >
          &larr; Voltar para a lista
        </button>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-blue-700"></div>
        
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
          
          {/* Product Image Gallery Section */}
          <div className="flex-shrink-0 flex flex-col gap-3 md:w-80">
             {/* Main Image */}
             <div className="w-full aspect-square bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden shadow-inner p-4 relative group">
                {activeImage ? (
                  <img 
                    src={activeImage} 
                    alt={product.title} 
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" 
                  />
                ) : (
                  <ImageOff size={48} className="text-gray-300" />
                )}
             </div>

             {/* Thumbnails */}
             {product.images && product.images.length > 1 && (
               <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar px-1">
                 {product.images.map((img, idx) => (
                   <button
                     key={idx}
                     onClick={() => setActiveImage(img.reference)}
                     className={`flex-shrink-0 w-16 h-16 border rounded-md overflow-hidden p-1 bg-white transition-all ${
                       activeImage === img.reference 
                         ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm' 
                         : 'border-gray-200 hover:border-blue-300 opacity-70 hover:opacity-100'
                     }`}
                   >
                     <img 
                       src={img.reference} 
                       alt={`Thumbnail ${idx + 1}`} 
                       className="w-full h-full object-contain"
                     />
                   </button>
                 ))}
               </div>
             )}
          </div>

          {/* Main Info */}
          <div className="flex-1 space-y-3">
             <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-[200px]">
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded border border-gray-200">
                     {product.brand}
                   </span>
                   <h2 className="text-2xl font-extrabold text-gray-900 leading-tight mt-2">
                      {product.title}
                   </h2>
                   <div className="flex items-center gap-3 mt-1 text-gray-500 font-mono text-sm">
                      <span className="flex items-center gap-1"><Tag size={14}/> SKU: {product.sku}</span>
                      {ean && (
                        <span className="flex items-center gap-1 border-l border-gray-300 pl-3">
                           <Barcode size={14}/> EAN: {ean}
                        </span>
                      )}
                   </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border ${status.style}`}>
                     {status.icon}
                     <span>{status.label}</span>
                  </div>

                  {/* Pricing Section - Prominent */}
                  {price && (
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-right min-w-[180px]">
                       <div className="text-xs text-gray-400 line-through">
                         De: {formatValue(price.list_price, price.normalizer)}
                       </div>
                       <div className="text-2xl font-extrabold text-blue-700 leading-none mt-0.5">
                         {formatValue(price.price, price.normalizer)}
                       </div>
                       <div className="text-[10px] text-blue-400 mt-1 flex items-center justify-end gap-1">
                         <Clock size={10} /> Atualizado: {formatDate(price.updated_at)}
                       </div>
                    </div>
                  )}
                  {!price && (
                     <div className="text-xs text-gray-400 italic mt-1">Preço indisponível</div>
                  )}
                  
                  {/* Stock Section */}
                  {stock && (
                    <div className={`mt-1 px-3 py-1.5 rounded-lg border flex items-center justify-between gap-3 w-full max-w-[180px] ${stock.quantity > 0 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                       <div className="flex items-center gap-1.5 text-xs font-bold uppercase">
                          <PackageCheck size={14} />
                          <span>Estoque</span>
                       </div>
                       <span className="font-mono font-bold text-base">{stock.quantity}</span>
                    </div>
                  )}
                </div>
             </div>

             <div className="pt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                  <Calendar size={14} className="text-gray-400" /> 
                  Criado: <span className="font-medium text-gray-700">{formatDate(product.created_at)}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                  <Layers size={14} className="text-gray-400" /> 
                  Condição: <span className="font-medium text-gray-700">{product.condition}</span>
                </span>
             </div>

             {marketplaceUrl && (
                <div className="pt-2">
                  <a 
                    href={marketplaceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink size={16} /> Ver no Magazine Luiza
                  </a>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         
         {/* Dimensions Card */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-gray-100">
              <Ruler size={18} className="text-blue-500" /> Dimensões e Peso
            </h3>
            
            {dims ? (
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-400 uppercase font-bold">Altura</span>
                    <p className="font-mono text-lg font-medium text-gray-800">
                       {dims.height.value} <span className="text-sm text-gray-500">{dims.height.unit}</span>
                    </p>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-400 uppercase font-bold">Largura</span>
                    <p className="font-mono text-lg font-medium text-gray-800">
                       {dims.width.value} <span className="text-sm text-gray-500">{dims.width.unit}</span>
                    </p>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-400 uppercase font-bold">Comprimento</span>
                    <p className="font-mono text-lg font-medium text-gray-800">
                       {dims.length.value} <span className="text-sm text-gray-500">{dims.length.unit}</span>
                    </p>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-400 uppercase font-bold">Peso</span>
                    <p className="font-mono text-lg font-medium text-gray-800">
                       {dims.weight.value} <span className="text-sm text-gray-500">{dims.weight.unit}</span>
                    </p>
                 </div>
              </div>
            ) : (
              <p className="text-gray-400 italic">Informações de dimensão não disponíveis.</p>
            )}
         </div>

         {/* Attributes / Identifiers */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-gray-100">
              <Box size={18} className="text-blue-500" /> Ficha Técnica
            </h3>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
               {product.identifiers && product.identifiers.length > 0 && (
                 <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-400 mb-2">Identificadores</h4>
                    <div className="space-y-1">
                      {product.identifiers.map((id, idx) => (
                         <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600 font-medium">{id.type}:</span>
                            <span className="font-mono text-gray-800">{id.value}</span>
                         </div>
                      ))}
                    </div>
                 </div>
               )}

               {product.attributes && product.attributes.length > 0 ? (
                 <div>
                    <h4 className="text-xs font-bold text-gray-400 mb-2">Atributos</h4>
                    <div className="divide-y divide-gray-100">
                      {product.attributes.map((attr, idx) => (
                         <div key={idx} className="flex justify-between py-1.5 text-sm">
                            <span className="text-gray-600">{attr.name}</span>
                            <span className="text-gray-800 font-medium text-right ml-4">{attr.value}</span>
                         </div>
                      ))}
                    </div>
                 </div>
               ) : (
                 <p className="text-gray-400 italic">Nenhum atributo adicional listado.</p>
               )}
            </div>
         </div>

      </div>

      {/* Description */}
      {product.description && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
            Descrição
          </h3>
          <div 
             className="prose prose-sm text-gray-600 max-w-none"
             dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}
    </div>
  );
};