// types.ts

export interface AmountDetail {
  currency: string;
  normalizer: number;
  total: number;
  value?: number; // Sometimes used instead of total in unit_price
}

export interface OrderAmounts {
  currency: string;
  normalizer: number;
  total: number;
  discount: AmountDetail;
  freight: AmountDetail;
  tax: AmountDetail;
  commission?: AmountDetail;
}

export interface Customer {
  name: string;
  document_number: string;
  customer_type: string;
  birth_date?: string;
  email?: string; // Optional as it wasn't in the sample but might exist
  phone_number?: string;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
  reference?: string;
}

export interface ShippingRecipient {
  name: string;
  document_number: string;
  address: Address;
}

export interface ShippingProvider {
  name: string;
  description: string;
}

export interface ShippingDeadline {
  value: number;
  precision: string;
  limit_date: string;
}

export interface Shipping {
  recipient: ShippingRecipient;
  provider?: ShippingProvider;
  deadline?: ShippingDeadline;
  estimated_delivery?: string;
}

export interface ItemImage {
  url: string;
}

export interface ItemInfo {
  sku: string;
  name: string;
  brand: string;
  images: ItemImage[];
}

export interface OrderItem {
  sequencial: number;
  quantity: number;
  measure_unit: string;
  unit_price: AmountDetail;
  amounts: OrderAmounts;
  info: ItemInfo;
}

export interface Delivery {
  code: string;
  id: string;
  status: string;
  amounts: OrderAmounts;
  shipping: Shipping;
  items: OrderItem[];
}

export interface Payment {
  description: string;
  installments: number;
  method: string;
  method_brand?: string;
  amount: number;
  normalizer: number;
  currency: string;
}

export interface OrderChannel {
  extras?: {
    alias?: string;
  }
}

export interface Order {
  id: string;
  code: string;
  status: string;
  created_at: string;
  approved_at?: string;
  purchased_at?: string;
  updated_at: string;
  channel?: OrderChannel;
  customer?: Customer;
  payments: Payment[];
  amounts: OrderAmounts;
  deliveries: Delivery[];
  [key: string]: any;
}

export interface PaginationMeta {
  page: {
    limit: number;
    offset: number;
    count: number;
    max_limit: number;
  };
  links: {
    next?: string;
    self: string;
    previous?: string;
  };
}

export interface OrdersListResponse {
  meta: PaginationMeta;
  results: Order[];
}

export interface ApiError {
  message: string;
  status?: number;
}

// --- Product / Portfolio Types ---

export interface ProductDimensionValue {
  value: number;
  unit: string;
}

export interface ProductDimension {
  name: string;
  height: ProductDimensionValue;
  width: ProductDimensionValue;
  length: ProductDimensionValue;
  weight: ProductDimensionValue;
}

export interface ProductImage {
  type: string;
  reference: string;
}

export interface ProductUrl {
  channel: string;
  url: string;
}

export interface NameValue {
  name: string;
  value: string;
}

export interface ProductIdentifier {
  type: string;
  value: string;
}

export interface Product {
  sku: string;
  title: string;
  description: string;
  status: string;
  condition: string;
  brand: string;
  images: ProductImage[];
  dimensions: ProductDimension[];
  url_marketplace?: ProductUrl[];
  created_at: string;
  updated_at: string;
  active: boolean;
  identifiers?: ProductIdentifier[];
  attributes?: NameValue[];
  datasheet?: NameValue[];
  [key: string]: any;
}

export interface PortfolioResponse {
  meta: PaginationMeta;
  results: Product[];
}

// --- Price Types ---

export interface PriceDetail {
  list_price: number;
  price: number;
  currency: string;
  normalizer: number;
  channel: {
    id: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PriceResponse {
  results: PriceDetail[];
  meta: PaginationMeta;
}

// --- Stock Types ---

export interface StockDetail {
  type: string;
  quantity: number;
  channel: {
    id: string;
  };
  created_at: string;
  updated_at: string;
}

export interface StockResponse {
  results: StockDetail[];
  meta: PaginationMeta;
}