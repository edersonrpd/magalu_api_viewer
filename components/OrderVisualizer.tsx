import React, { useState } from 'react';
import { Order, Delivery, Product, PriceDetail, StockDetail } from '../types';
import { 
  User, MapPin, CreditCard, Calendar, ShoppingBag, 
  Truck, Package, CheckCircle, Clock, X, Loader
} from 'lucide-react';
import { formatValue, formatDate, getStatusConfig, getCustomerInfo } from '../utils';
import { fetchProduct, fetchProductPrice, fetchProductStock } from '../services/magaluService';
import { ProductVisualizer } from './ProductVisualizer';

interface OrderVisualizerProps {
  order: Order;
  token?: string; // Token is needed to fetch product details
  onBack?: () => void;
}

export const OrderVisualizer: React.FC<OrderVisualizerProps> = ({ order, token, onBack }) => {
  
  const orderStatus = getStatusConfig(order.status);
  const customer = getCustomerInfo(order);
  
  // Modal State
  const [selectedProductSku, setSelectedProductSku] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<PriceDetail | undefined>(undefined);
  const [selectedStock, setSelectedStock] = useState<StockDetail | undefined>(undefined);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Extract shipping address from the first delivery (usually same for all)
  const shippingAddress = order.deliveries?.[0]?.shipping?.recipient?.address;
  const shippingProvider = order.deliveries?.[0]?.shipping?.provider;
  const shippingDeadline = order.deliveries?.[0]?.shipping?.deadline;

  // Handle clicking on an item to view details
  const handleViewProduct = async (sku: string) => {
    if (!token) {
      alert("Token não disponível para buscar detalhes do produto.");
      return;
    }

    setSelectedProductSku(sku);
    setIsProductLoading(true);
    setProductError(null);
    setSelectedProduct(null);
    setSelectedPrice(undefined);
    setSelectedStock(undefined);

    try {
      // Fetch data in parallel
      const [product, priceResponse, stockResponse] = await Promise.all([
        fetchProduct(sku, token),
        fetchProductPrice(sku, token),
        fetchProductStock(sku, token)
      ]);

      setSelectedProduct(product);

      if (priceResponse?.results?.length > 0) {
        setSelectedPrice(priceResponse.results[0]);
      }

      if (stockResponse?.results?.length > 0) {
        const availableStock = stockResponse.results.find(s => s.type === 'AVAILABLE') || stockResponse.results[0];
        setSelectedStock(availableStock);
      }

    } catch (err: any) {
      setProductError(err.message || "Erro ao carregar detalhes do produto.");
    } finally {
      setIsProductLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedProductSku(null);
    setSelectedProduct(null);
  };

  // --- Style Helpers ---

  // 1. Main Status Theme (Vibrant Gradients for Header)
  const getMainStatusTheme = (color: string) => {
    const themes: Record<string, { badge: string, stripe: string }> = {
      red: {
        badge: 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-red-200 shadow-xl border-red-400',
        stripe: 'from-red-500 to-pink-600'
      },
      emerald: {
        badge: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-200 shadow-xl border-emerald-400',
        stripe: 'from-emerald-500 to-teal-500'
      },
      green: {
        badge: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-200 shadow-xl border-green-400',
        stripe: 'from-green-500 to-emerald-600'
      },
      blue: {
        badge: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-200 shadow-xl border-blue-400',
        stripe: 'from-blue-500 to-indigo-600'
      },
      amber: {
        badge: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-200 shadow-xl border-amber-400',
        stripe: 'from-amber-400 to-orange-500'
      },
      sky: {
        badge: 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-sky-200 shadow-xl border-sky-400',
        stripe: 'from-sky-400 to-blue-500'
      },
      gray: {
        badge: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-gray-200 shadow-xl border-gray-400',
        stripe: 'from-gray-500 to-gray-600'
      },
    };
    return themes[color] || themes.gray;
  };

  // 2. Compact Status Style (Solid colors for deliveries)
  const getCompactStatusStyle = (color: string) => {
    const styles: Record<string, string> = {
      red: 'bg-red-600 text-white border-red-700 shadow-red-100',
      emerald: 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-100',
      green: 'bg-green-600 text-white border-green-700 shadow-green-100',
      blue: 'bg-blue-600 text-white border-blue-700 shadow-blue-100',
      amber: 'bg-amber-500 text-white border-amber-600 shadow-amber-100',
      sky: 'bg-sky-500 text-white border-sky-600 shadow-sky-100',
      gray: 'bg-gray-500 text-white border-gray-600 shadow-gray-100',
    };
    return styles[color] || styles.gray;
  };

  // 3. Delivery Header Backgrounds (Pastel)
  const getDeliveryHeaderStyle = (color: string) => {
    const styles: Record<string, string> = {
      red: 'bg-red-50 border-red-200',
      emerald: 'bg-emerald-50 border-emerald-200',
      green: 'bg-green-50 border-green-200',
      blue: 'bg-blue-50 border-blue-200',
      amber: 'bg-amber-50 border-amber-200',
      sky: 'bg-sky-50 border-sky-200',
      gray: 'bg-gray-50 border-gray-200',
    };
    return styles[color] || styles.gray;
  };

  const getDeliveryTextStyle = (color: string) => {
    const styles: Record<string, string> = {
      red: 'text-red-700',
      emerald: 'text-emerald-700',
      green: 'text-green-700',
      blue: 'text-blue-700',
      amber: 'text-amber-800',
      sky: 'text-sky-700',
      gray: 'text-gray-700',
    };
    return styles[color] || styles.gray;
  };

  const mainStatusTheme = getMainStatusTheme(orderStatus.color);

  return (
    <div className="space-y-6 animate-fade-in font-sans relative">
      
      {onBack && (
        <button 
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline mb-2 flex items-center gap-1"
        >
          &larr; Voltar para a lista
        </button>
      )}

      {/* 1. Header Card - Redesigned for Prominence */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative group">
        {/* Dynamic Colorful Stripe */}
        <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${mainStatusTheme.stripe}`}></div>
        
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 pl-8">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
               <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded border border-gray-200 uppercase tracking-wider">
                 {order.channel?.extras?.alias || 'Canal Magalu'}
               </span>
               <span className="text-sm text-gray-400 font-mono">ID: {order.id}</span>
             </div>
             <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-baseline gap-2">
                Pedido #{order.code}
             </h2>
             <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-400" /> 
                  Criado em: <span className="font-medium text-gray-700">{formatDate(order.created_at)}</span>
                </span>
                {order.approved_at && (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-green-500" /> 
                    Aprovado em: <span className="font-medium text-gray-700">{formatDate(order.approved_at)}</span>
                  </span>
                )}
             </div>
          </div>
          
          <div className="flex flex-col items-end">
             {/* Main Vibrant Status Badge */}
             <div className={`px-8 py-4 rounded-2xl font-bold text-xl flex items-center gap-3 border ${mainStatusTheme.badge} transform transition-all duration-300 hover:scale-105 hover:-translate-y-1`}>
                {React.cloneElement(orderStatus.icon as React.ReactElement<any>, { size: 28, strokeWidth: 2.5 })}
                <span className="tracking-wide text-shadow-sm">{orderStatus.label}</span>
             </div>
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          
          {/* Customer */}
          <div className="flex gap-4 items-start">
             <div className="p-2.5 bg-white rounded-lg shadow-sm border border-gray-100 text-gray-400">
               <User size={20} />
             </div>
             <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cliente</h3>
                <p className="font-bold text-gray-800">{customer.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{customer.document_number}</p>
                {(customer.email || customer.phone_number) && (
                   <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                     {customer.email && <p>{customer.email}</p>}
                     {customer.phone_number && <p>{customer.phone_number}</p>}
                   </div>
                )}
             </div>
          </div>

          {/* Shipping Info */}
          <div className="flex gap-4 items-start">
             <div className="p-2.5 bg-white rounded-lg shadow-sm border border-gray-100 text-gray-400">
               <MapPin size={20} />
             </div>
             <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Endereço de Entrega</h3>
                {shippingAddress ? (
                  <>
                    <p className="text-sm font-medium text-gray-800 leading-tight">
                      {shippingAddress.street}, {shippingAddress.number}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {shippingAddress.district}, {shippingAddress.city} - {shippingAddress.state}
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">CEP: {shippingAddress.zipcode}</p>
                  </>
                ) : (
                   <p className="text-sm text-gray-400 italic">Não informado</p>
                )}
             </div>
          </div>

          {/* Payment Info */}
          <div className="flex gap-4 items-start">
             <div className="p-2.5 bg-white rounded-lg shadow-sm border border-gray-100 text-gray-400">
               <CreditCard size={20} />
             </div>
             <div className="flex-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pagamento</h3>
                {order.payments?.map((pay, idx) => (
                  <div key={idx} className="mb-2 last:mb-0">
                     <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold text-gray-800">{pay.description}</span>
                        <span className="text-xs font-mono bg-gray-200 px-1 rounded">{pay.method}</span>
                     </div>
                     <p className="text-xs text-gray-500">
                        {pay.installments}x de {formatValue(pay.amount / pay.installments, pay.normalizer)}
                     </p>
                  </div>
                ))}
                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-end">
                   <span className="text-xs font-medium text-gray-500">Total</span>
                   <span className="text-lg font-bold text-gray-900">{formatValue(order.amounts.total, order.amounts.normalizer)}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Deliveries and Items */}
      {order.deliveries.map((delivery: Delivery, idx: number) => {
        const deliveryStatus = getStatusConfig(delivery.status);
        const headerStyle = getDeliveryHeaderStyle(deliveryStatus.color);
        const textStyle = getDeliveryTextStyle(deliveryStatus.color);
        const compactBadgeStyle = getCompactStatusStyle(deliveryStatus.color);

        return (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`px-6 py-4 border-b ${headerStyle} flex flex-wrap justify-between items-center gap-4`}>
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-full shadow-sm">
                  <Package size={20} className={textStyle} />
                </div>
                <div>
                   <h3 className={`text-base font-bold ${textStyle}`}>
                     Entrega {idx + 1}
                   </h3>
                   <div className="flex items-center gap-2 text-xs opacity-80">
                      <span className="font-mono">{delivery.code}</span>
                      {shippingProvider && (
                        <>• <span>{shippingProvider.name}</span></>
                      )}
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                 {shippingDeadline && (
                    <div className="hidden sm:flex flex-col items-end text-xs text-gray-500">
                       <span className="flex items-center gap-1"><Clock size={12}/> Prazo Estimado</span>
                       <span className="font-medium">{formatDate(shippingDeadline.limit_date)}</span>
                    </div>
                 )}
                 
                 <span className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border shadow-sm ${compactBadgeStyle}`}>
                   {React.cloneElement(deliveryStatus.icon as React.ReactElement<any>, { size: 14 })}
                   {deliveryStatus.label}
                 </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-bold w-20">Produto</th>
                    <th className="px-6 py-4 font-bold">Detalhes</th>
                    <th className="px-6 py-4 font-bold text-center">Qtd</th>
                    <th className="px-6 py-4 font-bold text-right">Unitário</th>
                    <th className="px-6 py-4 font-bold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {delivery.items.map((item, itemIdx) => (
                    <tr 
                      key={itemIdx} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => handleViewProduct(item.info.sku)}
                    >
                      <td className="px-6 py-4">
                        <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg p-1 flex items-center justify-center overflow-hidden shadow-sm relative group-hover:border-blue-300 transition-colors">
                          {item.info.images && item.info.images.length > 0 ? (
                            <img src={item.info.images[0].url} alt={item.info.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                          ) : (
                            <ShoppingBag size={24} className="text-gray-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors" title={item.info.name}>
                          {item.info.name}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                            SKU: {item.info.sku}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            {item.info.brand}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                          <Package size={12} /> Ver detalhes do anúncio
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-600">
                        {formatValue(item.unit_price.value, item.unit_price.normalizer)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        {formatValue(item.amounts.total, item.amounts.normalizer)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Delivery Totals Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end items-end gap-6 sm:gap-12 text-sm">
               <div className="text-gray-600 flex flex-col items-end">
                  <span className="text-xs text-gray-400 uppercase font-bold tracking-wide">Frete desta entrega</span>
                  <span className="font-medium text-lg">{formatValue(delivery.amounts.freight.total, delivery.amounts.freight.normalizer)}</span>
               </div>
               <div className="text-gray-900 flex flex-col items-end">
                  <span className="text-xs text-gray-400 uppercase font-bold tracking-wide">Total desta entrega</span>
                  <span className="font-bold text-xl text-blue-700">{formatValue(delivery.amounts.total, delivery.amounts.normalizer)}</span>
               </div>
            </div>
          </div>
        );
      })}
      
      {/* 3. Global Totals Summary */}
      <div className="flex justify-end mt-4">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 w-full md:w-96 space-y-4">
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-gray-100 pb-3">
              <ShoppingBag size={18} className="text-blue-600" /> Resumo Financeiro
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal (Produtos)</span>
                <span>{formatValue(order.amounts.total - order.amounts.freight.total + order.amounts.discount.total, order.amounts.normalizer)}</span>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600">
                <span>Frete Total</span>
                <span>{formatValue(order.amounts.freight.total, order.amounts.freight.normalizer)}</span>
              </div>
              
              {order.amounts.discount.total > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                  <span>Descontos</span>
                  <span>-{formatValue(order.amounts.discount.total, order.amounts.discount.normalizer)}</span>
                </div>
              )}
            </div>

            <div className="h-px bg-gray-200 my-2"></div>
            
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-gray-800">Total do Pedido</span>
              <span className="text-2xl font-extrabold text-blue-700">{formatValue(order.amounts.total, order.amounts.normalizer)}</span>
            </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProductSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           {/* Backdrop */}
           <div 
             className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
             onClick={closeModal}
           ></div>

           {/* Modal Content */}
           <div className="relative bg-gray-50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                 <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Package size={20} className="text-blue-600"/>
                    Detalhes do Anúncio
                 </h3>
                 <button 
                   onClick={closeModal}
                   className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                 >
                   <X size={24} />
                 </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                 {isProductLoading ? (
                   <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <Loader size={48} className="animate-spin text-blue-500 mb-4" />
                      <p>Carregando informações do produto...</p>
                   </div>
                 ) : productError ? (
                   <div className="flex flex-col items-center justify-center h-64 text-red-500">
                      <div className="bg-red-50 p-4 rounded-full mb-3">
                         <X size={32} />
                      </div>
                      <p className="font-medium text-lg">Erro ao carregar</p>
                      <p className="text-sm">{productError}</p>
                   </div>
                 ) : selectedProduct ? (
                   <ProductVisualizer 
                     product={selectedProduct} 
                     price={selectedPrice}
                     stock={selectedStock}
                     // Pass undefined for onBack so we don't show the "Back to List" button inside the modal
                     onBack={undefined} 
                   />
                 ) : null}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
                <button 
                  onClick={closeModal}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};