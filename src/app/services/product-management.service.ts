import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {WebStorageService} from './web-storage.service';

export interface ManagedVariant {
  documentId?: string;
  sku: string;
  label: string;
  price: number | string;
  stockOnHand: number;
  stockReserved: number;
  expectedStockOnHand?: number;
  isActive: boolean;
}

export interface ManagedCategory {
  documentId: string;
  name: string;
}

export interface ManagedImage {
  id: number;
  url: string;
}

export interface ManagedProduct {
  documentId: string;
  updatedAt?: string;
  name: string;
  description: string;
  gender: 'male' | 'female' | 'unisex';
  isActive: boolean;
  images: ManagedImage[];
  categories: ManagedCategory[];
  variants: ManagedVariant[];
}

export interface ProductManagementPage {
  data: ManagedProduct[];
  categories: ManagedCategory[];
  meta: { pagination: { page: number; pageSize: number; total: number; pageCount: number } };
}

export interface ProductManagementInput {
  expectedUpdatedAt?: string;
  name: string;
  description: string;
  categoryDocumentId: string;
  isActive: boolean;
  images: number[];
  variants: Omit<ManagedVariant, 'stockReserved'>[];
}

@Injectable({providedIn: 'root'})
export class ProductManagementService {
  private readonly url = `${environment.strapiUrl}/api/management/products`;

  constructor(private readonly http: HttpClient, private readonly storage: WebStorageService) {
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({Authorization: `Bearer ${this.storage.getSession('jwtResponse')?.token ?? ''}`});
  }

  list(page: number, search: string, category: string, active: string): Observable<ProductManagementPage> {
    let params = new HttpParams().set('page', page);
    if (search.trim()) params = params.set('search', search.trim());
    if (category) params = params.set('category', category);
    if (active) params = params.set('active', active);
    return this.http.get<ProductManagementPage>(this.url, {headers: this.headers(), params});
  }

  save(documentId: string | undefined, data: ProductManagementInput): Observable<{ data: ManagedProduct }> {
    return documentId
      ? this.http.put<{
        data: ManagedProduct
      }>(`${this.url}/${encodeURIComponent(documentId)}`, {data}, {headers: this.headers()})
      : this.http.post<{ data: ManagedProduct }>(this.url, {data}, {headers: this.headers()});
  }

  delete(documentId: string): Observable<unknown> {
    return this.http.delete(`${this.url}/${encodeURIComponent(documentId)}`, {headers: this.headers()});
  }

  upload(file: File): Observable<ManagedImage[]> {
    const data = new FormData();
    data.append('files', file);
    return this.http.post<ManagedImage[]>(`${environment.strapiUrl}/api/upload`, data, {headers: this.headers()});
  }

  imageUrl(image?: ManagedImage): string {
    return image ? new URL(image.url, environment.strapiUrl).href : 'assets/images/product-placeholder.svg';
  }
}
