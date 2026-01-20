import React, { useState } from 'react';
import { Search, Package } from 'lucide-react';

interface InputSectionProps {
  onSearch: (orderCode: string) => void;
  loading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ onSearch, loading }) => {
  const [orderCode, setOrderCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Split by comma, clean each part, filter empty, and join back
    const codes = orderCode.split(',').map(code => {
      let cleaned = code.trim();
      cleaned = cleaned.replace(/-\d+$/, ''); // Remove suffix like -1
      cleaned = cleaned.replace(/^LU-/i, ''); // Remove prefix LU-
      return cleaned;
    }).filter(code => code.length > 0);

    const cleanedInput = codes.join(', ');

    if (cleanedInput !== orderCode) {
      setOrderCode(cleanedInput);
    }

    // Pass the comma-separated string to parent; parent handles the bulk fetch logic
    onSearch(cleanedInput);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="orderCode" className="block text-sm font-medium text-gray-700 flex items-center gap-2">
              <Package size={16} /> Código(s) do Pedido
            </label>
            <div className="flex gap-2">
              <input
                id="orderCode"
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="Ex: 1502870666843360, 2134567890123456..."
                className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-all
                  ${loading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30'
                  }`}
              >
                {loading ? (
                  <span>Buscando...</span>
                ) : (
                  <>
                    <Search size={18} /> Buscar
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400">
               Separe múltiplos códigos por vírgula. Removemos automaticamente prefixos "LU-" e sufixos de entrega.
            </p>
          </div>
      </form>
    </div>
  );
};