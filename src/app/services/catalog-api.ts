import {Product} from '../entities/items/product';
import {environment} from '../../environments/environment';

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
    label?: string;
    sizeMl?: number | string | null;
    concentration?: string;
    price: string | number;
    stockOnHand: number;
    stockReserved: number;
    image?: { url: string };
  }[];
  reviewCount?: number;
}

export interface CatalogPage {
  data: CatalogProduct[];
  meta: { pagination: { page: number; pageCount: number } };
}

export function toProduct(data: CatalogProduct): Product {
  const variants = [...(data.variants ?? [])].sort((a, b) => Number(a.price) - Number(b.price) || a.sku.localeCompare(b.sku));
  const variant = variants.find(v => v.stockOnHand > v.stockReserved) ?? variants[0];
  const image = data.images?.[0]?.url ?? variant?.image?.url;
  const product = new Product(
    data.id, variant?.sku ?? '', data.name, data.description ?? '',
    Number(variant?.price ?? 0),
    image ? new URL(image, environment.strapiUrl).href : 'assets/images/product-placeholder.svg',
    variant ? Math.max(0, variant.stockOnHand - variant.stockReserved) : 0
  );
  product.documentId = data.documentId;
  product.variantDocumentId = variant?.documentId;
  product.pcId = data.categories?.[0]?.id ?? 0;
  product.reviewCount = Number.isSafeInteger(data.reviewCount) && data.reviewCount! >= 0 ? data.reviewCount! : 0;
  product.variants = variants.map(v => ({
    documentId: v.documentId, sku: v.sku,
    label: v.label?.trim() || (v.sizeMl ? `${Number(v.sizeMl)} ml${v.concentration && v.concentration !== 'unspecified' ? ' · ' + v.concentration.toUpperCase() : ''}` : v.sku),
    price: Number(v.price), availableStock: Math.max(0, v.stockOnHand - v.stockReserved),
    imageUrl: v.image?.url ? new URL(v.image.url, environment.strapiUrl).href : product.imageUrl,
  }));
  product.variantLabel = product.variants.find(v => v.documentId === variant?.documentId)?.label ?? '';
  return product;
}

export function selectProductVariant(product: Product, documentId: string): Product {
  const variant = product.variants.find(v => v.documentId === documentId);
  if (!variant) return product;
  return Object.assign(new Product(product.pid, variant.sku, product.name, product.description,
    variant.price, variant.imageUrl, variant.availableStock), product, {
    sku: variant.sku, price: variant.price, imageUrl: variant.imageUrl,
    unitInStock: variant.availableStock, variantDocumentId: variant.documentId, variantLabel: variant.label,
  });
}
