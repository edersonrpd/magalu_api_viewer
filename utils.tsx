import React from 'react';
import { 
  XCircle, CheckCheck, CheckCircle, Truck, PackageCheck, Sparkles, Clock, Globe, EyeOff
} from 'lucide-react';
import { Order } from './types';

export const formatValue = (value: number | undefined, normalizer: number = 100) => {
  if (value === undefined) return 'R$ 0,00';
  const realValue = value / normalizer;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(realValue);
};

export const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateString));
};

export interface StatusConfig {
  style: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}

export const getStatusConfig = (statusRaw: string): StatusConfig => {
  const s = (statusRaw || '').toLowerCase();
  
  // --- Products ---
  if (s.includes('unpublished') || s.includes('disabled')) {
    return {
      style: 'bg-gray-100 text-gray-600 border-gray-200 ring-1 ring-inset ring-gray-500/20',
      icon: <EyeOff size={16} strokeWidth={2} />,
      label: 'INATIVO / NÃO PUBLICADO',
      color: 'gray'
    };
  }
  if (s.includes('published') || s.includes('active')) {
    return {
      style: 'bg-green-50 text-green-700 border-green-200 ring-1 ring-inset ring-green-600/20',
      icon: <Globe size={16} strokeWidth={2} />,
      label: 'PUBLICADO',
      color: 'green'
    };
  }

  // --- Orders ---
  // Cancelled
  if (s.includes('cancel')) {
    return {
      style: 'bg-red-50 text-red-700 border-red-200 ring-1 ring-inset ring-red-600/20',
      icon: <XCircle size={16} strokeWidth={2} />,
      label: 'CANCELADO',
      color: 'red'
    };
  }
  // Delivered
  if (s.includes('deliver') || s.includes('entregue') || s.includes('finished')) {
    return {
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-inset ring-emerald-600/20',
      icon: <CheckCheck size={16} strokeWidth={2} />,
      label: 'CONCLUÍDO',
      color: 'emerald'
    };
  }
  // Approved / Paid
  if (s.includes('approv') || s.includes('paid') || s.includes('pago')) {
    return {
      style: 'bg-green-50 text-green-700 border-green-200 ring-1 ring-inset ring-green-600/20',
      icon: <CheckCircle size={16} strokeWidth={2} />,
      label: 'APROVADO',
      color: 'green'
    };
  }
  // Shipping / Transport
  if (s.includes('ship') || s.includes('transport') || s.includes('enviado')) {
    return {
      style: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-inset ring-blue-600/20',
      icon: <Truck size={16} strokeWidth={2} />,
      label: 'TRANSPORTE',
      color: 'blue'
    };
  }
  // Processing / Invoiced
  if (s.includes('invoic') || s.includes('faturado') || s.includes('process')) {
    return {
      style: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-inset ring-amber-600/20',
      icon: <PackageCheck size={16} strokeWidth={2} />,
      label: 'PROCESSANDO',
      color: 'amber'
    };
  }
  // New / Created
  if (s.includes('new') || s.includes('novo') || s.includes('created')) {
    return {
      style: 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-inset ring-sky-600/20',
      icon: <Sparkles size={16} strokeWidth={2} />,
      label: 'NOVO',
      color: 'sky'
    };
  }

  // Default / Pending
  return {
    style: 'bg-gray-50 text-gray-600 border-gray-200 ring-1 ring-inset ring-gray-500/20',
    icon: <Clock size={16} strokeWidth={2} />,
    label: (statusRaw || 'UNKNOWN').toUpperCase(),
    color: 'gray'
  };
};

/**
 * Safely extracts customer info from either the root customer object
 * or the shipping recipient of the first delivery.
 */
export const getCustomerInfo = (order: Order) => {
  if (order.customer && order.customer.name) {
    return {
      name: order.customer.name,
      document_number: order.customer.document_number,
      email: order.customer.email,
      phone_number: order.customer.phone_number
    };
  }
  
  // Fallback to first delivery recipient
  const recipient = order.deliveries?.[0]?.shipping?.recipient;
  return {
    name: recipient?.name || 'Cliente não identificado',
    document_number: recipient?.document_number || '-',
    email: undefined,
    phone_number: undefined
  };
};
// --- NCM (Nomenclatura Comum do Mercosul) ---

// Uma chave é considerada NCM quando é exatamente "ncm" ou alguma variação
// comum ("ncm_code", "codigo ncm", "código NCM", "NCM do produto", ...).
export const isNcmKey = (key: string | undefined): boolean => {
  if (!key) return false;
  const normalized = key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return /(^|[^a-z])ncm([^a-z]|$)/.test(normalized);
};

// A API pode devolver o NCM sem máscara (8 dígitos). Nesse caso aplicamos o
// formato usual 0000.00.00; qualquer outro formato é mantido como veio.
export const formatNcm = (raw: string): string => {
  const value = raw.trim();
  const digits = value.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  return value;
};

/**
 * Procura o NCM do produto nos vários lugares em que a API do Magalu pode
 * devolvê-lo: campo raiz, identificadores, atributos ou ficha técnica.
 */
export const getProductNcm = (product: any): string | undefined => {
  if (!product) return undefined;

  const fromValue = (value: any): string | undefined => {
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim();
      return text ? text : undefined;
    }
    if (value && typeof value === 'object') {
      return fromValue(value.value ?? value.code);
    }
    return undefined;
  };

  // 1) Campo na raiz do produto (ncm, ncm_code, ...).
  const rootKey = Object.keys(product).find(key => isNcmKey(key));
  const fromRoot = rootKey ? fromValue(product[rootKey]) : undefined;
  if (fromRoot) return fromRoot;

  // 2) Listas nome/valor: identificadores, atributos e ficha técnica.
  const lists: any[][] = [
    product.identifiers,
    product.attributes,
    product.datasheet
  ].filter(Array.isArray);

  for (const list of lists) {
    const match = list.find((entry: any) => isNcmKey(entry?.type ?? entry?.name));
    const value = fromValue(match?.value);
    if (value) return value;
  }

  return undefined;
};
