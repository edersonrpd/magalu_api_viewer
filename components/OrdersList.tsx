import React, { useState } from 'react';
import { Order, PaginationMeta } from '../types';
import { formatDate, formatValue, getStatusConfig, getCustomerInfo } from '../utils';
import { ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react';
import { Tooltip } from 'react-tooltip';

interface OrdersListProps {
  orders: Order[];
  meta: PaginationMeta;
  onPageChange: (offset: number) => void;
  onViewOrder: (order: Order) => void;
  loading: boolean;
}

export const OrdersList: React.FC<OrdersListProps> = ({ 
  orders, 
  meta, 
  onPageChange, 
  onViewOrder,
  loading
}) => {
  const [filter, setFilter] = useState('');

  // Local filtering for currently loaded page
  const filteredOrders = orders.filter(o => {
    const customer = getCustomerInfo(o);
    return o.code.includes(filter) || 
           customer.name.toLowerCase().includes(filter.toLowerCase());
  });

  const handlePrev = () => {
    if (meta.page.offset > 0) {
      const newOffset = Math.max(0, meta.page.offset - meta.page.limit);
      onPageChange(newOffset);
    }
  };

  const handleNext = () => {
    const nextOffset = meta.page.offset + meta.page.limit;
    if (nextOffset < meta.page.count) {
      onPageChange(nextOffset);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Filtrar nesta página..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 shadow-sm">
          <span>
            Mostrando <b>{meta.page.offset + 1}</b> - <b>{Math.min(meta.page.offset + meta.page.limit, meta.page.count)}</b> de <b>{meta.page.count}</b>
          </span>
          <div className="flex gap-1 ml-2">
            <button 
              onClick={handlePrev}
              disabled={meta.page.offset === 0 || loading}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={handleNext}
              disabled={(meta.page.offset + meta.page.limit) >= meta.page.count || loading}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3">Código</th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                // Skeleton loading rows
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-24 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-8 w-8 bg-gray-200 rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const status = getStatusConfig(order.status);
                  const customer = getCustomerInfo(order);
                  return (
                    <tr 
                      key={order.id} 
                      className="hover:bg-gray-50 transition-colors group cursor-default"
                      data-tooltip-id="order-row-tooltip"
                      data-tooltip-html={`
                        <div class="text-left">
                          <p class="font-bold mb-1 border-b border-gray-500 pb-1">Pedido #${order.code}</p>
                          <p><b>Cliente:</b> ${customer.name}</p>
                          <p><b>Status:</b> ${status.label}</p>
                          <p><b>Atualizado:</b> ${formatDate(order.updated_at)}</p>
                        </div>
                      `}
                    >
                      <td className="px-6 py-3 font-mono text-sm text-gray-600">
                        {order.code}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                        <p className="text-xs text-gray-400">{customer.document_number}</p>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.style}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900 text-sm">
                        {formatValue(order.amounts.total, order.amounts.normalizer)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewOrder(order);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Nenhum pedido encontrado nesta página.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Tooltip Component */}
      <Tooltip 
        id="order-row-tooltip" 
        style={{ 
          backgroundColor: "#1f2937", 
          color: "#fff", 
          padding: "12px", 
          borderRadius: "8px", 
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          zIndex: 50,
          opacity: 1
        }} 
        place="top"
        delayShow={300}
      />
    </div>
  );
};