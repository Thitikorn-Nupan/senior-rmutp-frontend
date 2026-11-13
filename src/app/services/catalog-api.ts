import { Product } from '../entities/items/product';
import { environment } from '../../environments/environment';

export interface CatalogProduct {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  images?: { url: string }[];
  categories?: { id: number }[];
  variants?: {
    documentId: string;
    sku: string;
    price: string | number;
    stockOnHand: number;
    stockReserved: number;
    image?: { url: string };
  }[];
}

export interface CatalogPage {
  data: CatalogProduct[];
  meta: { pagination: { page: number; pageCount: number } };
}

export function toProduct(data: CatalogProduct): Product {
  // The existing cards show one variant: the lowest priced active variant.
  const variant = data.variants?.[0];
  const image = variant?.image?.url ?? data.images?.[0]?.url;
  const product = new Product(
    data.id, variant?.sku ?? '', data.name, data.description ?? '',
    Number(variant?.price ?? 0),
    image ? new URL(image, environment.strapiUrl).href : 'assets/images/product-placeholder.svg',
    variant ? Math.max(0, variant.stockOnHand - variant.stockReserved) : 0
  );
  product.documentId = data.documentId;
  product.variantDocumentId = variant?.documentId;
  product.pcId = data.categories?.[0]?.id ?? 0;
  return product;
}
