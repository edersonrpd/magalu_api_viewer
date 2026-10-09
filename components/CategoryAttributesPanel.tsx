import React, { useEffect, useState } from 'react';
import { Category, CategoryAttributesResponse, AttributeRequired } from '../types';
import { fetchCategoryAttributes } from '../services/magaluService';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

interface CategoryAttributesPanelProps {
  category: Category;
  kind: 'attributes' | 'datasheet';
  token: string;
  onClose: () => void;
}

const LIMIT = 50;

const REQUIRED_STYLE: Record<string, string> = {
  required: 'bg-red-50 text-red-700 border-red-200',
  recommended: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  optional: 'bg-gray-50 text-gray-600 border-gray-200'
};

export const CategoryAttributesPanel: React.FC<CategoryAttributesPanelProps> = ({ category, kind, token, onClose }) => {
  const [required, setRequired] = useState<AttributeRequired | ''>('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<CategoryAttributesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trocar de categoria/tipo/filtro volta para a primeira página.
  useEffect(() => { setOffset(0); }, [category.id, kind, required]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCategoryAttributes(token, category.id, kind, { required, offset, limit: LIMIT })
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) { setData(null); setError(err.message || 'Erro ao buscar atributos.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, category.id, kind, required, offset]);

  const results = data?.results || [];
  const hasNext = !!data?.meta?.links?.next;
  const hasPrev = offset > 0;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-6 overflow-hidden animate-fade-in">
      <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-800">
            {kind === 'attributes' ? 'Atributos' : 'Ficha técnica'} — {category.name || category.id}
          </h3>
          <p className="text-xs text-gray-500">{category.path || category.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={required}
            onChange={(e) => setRequired(e.target.value as AttributeRequired | '')}
            aria-label="Filtrar por obrigatoriedade"
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todos</option>
            <option value="required">Obrigatórios</option>
            <option value="recommended">Recomendados</option>
            <option value="optional">Opcionais</option>
          </select>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-magalu-blue focus-visible:outline-none"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="m-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg flex items-start gap-2 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5" /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="p-8 flex justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
      ) : (
        !error && (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-3">Atributo</th>
                  <th className="px-6 py-3">Nome interno</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Obrigatoriedade</th>
                  <th className="px-6 py-3">Opções / Exemplo</th>
                  <th className="px-6 py-3">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhum item retornado.</td></tr>
                )}
                {results.map(attr => (
                  <tr key={attr.id} className={`hover:bg-gray-50 ${attr.active ? '' : 'opacity-50'}`}>
                    <td className="px-6 py-3 font-medium text-gray-900">{attr.display_name}</td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-600">{attr.name}</td>
                    <td className="px-6 py-3 text-gray-600">{attr.type}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded border text-xs font-medium ${REQUIRED_STYLE[attr.required] || REQUIRED_STYLE.optional}`}>
                        {attr.required}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-600 max-w-xs">
                      {attr.choices && attr.choices.length > 0
                        ? attr.choices.join(', ')
                        : attr.example || '—'}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500 space-x-1">
                      {attr.variation && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">variação</span>}
                      {attr.required_matching && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">matching</span>}
                      {attr.is_inherited && <span className="px-1.5 py-0.5 bg-gray-100 rounded">herdado</span>}
                      {!attr.active && <span className="px-1.5 py-0.5 bg-gray-100 rounded">inativo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={() => setOffset(Math.max(0, offset - LIMIT))}
          disabled={!hasPrev || loading}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-magalu-blue focus-visible:outline-none"
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        <span className="text-xs text-gray-500">{results.length} item(ns) · a partir de {offset}</span>
        <button
          onClick={() => setOffset(offset + LIMIT)}
          disabled={!hasNext || loading}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-magalu-blue focus-visible:outline-none"
        >
          Próxima <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
