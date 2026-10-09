import React from 'react';
import { Category, PaginationMeta } from '../types';
import { formatDate } from '../utils';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';

interface CategoriesListProps {
  categories: Category[];
  meta?: PaginationMeta;
  limit: number;
  loading: boolean;
  onPageChange: (offset: number) => void;
  onShowToast?: (message: string) => void;
}

export const CategoriesList: React.FC<CategoriesListProps> = ({
  categories,
  meta,
  limit,
  loading,
  onPageChange,
  onShowToast
}) => {
  const offset = meta?.page?.offset ?? 0;
  const hasNext = !!meta?.links?.next;
  const hasPrev = !!meta?.links?.previous || offset > 0;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onShowToast?.('ID copiado!');
    } catch {
      onShowToast?.('Não foi possível copiar.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-100 text-sm text-gray-600">
        {categories.length} categoria(s) nesta página
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Pai</th>
              <th className="px-6 py-3">Caminho</th>
              <th className="px-6 py-3">Atualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma categoria retornada.</td>
              </tr>
            )}
            {categories.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{cat.name || '—'}</td>
                <td className="px-6 py-3 font-mono text-xs text-gray-600">
                  <button
                    onClick={() => copy(cat.id)}
                    className="flex items-center gap-1 hover:text-magalu-blue focus-visible:ring-2 focus-visible:ring-magalu-blue focus-visible:outline-none rounded"
                    title="Copiar ID"
                    aria-label={`Copiar ID ${cat.id}`}
                  >
                    {cat.id} <Copy size={12} />
                  </button>
                </td>
                <td className="px-6 py-3 font-mono text-xs text-gray-600">{cat.parent_id || '—'}</td>
                <td className="px-6 py-3 text-gray-600">{cat.path || '—'}</td>
                <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{formatDate(cat.updated_at || cat.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={() => onPageChange(Math.max(0, offset - limit))}
          disabled={!hasPrev || loading}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-magalu-blue focus-visible:outline-none"
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        <span className="text-xs text-gray-500">Registros a partir de {offset}</span>
        <button
          onClick={() => onPageChange(offset + limit)}
          disabled={!hasNext || loading}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-magalu-blue focus-visible:outline-none"
        >
          Próxima <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
