import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {WebStorageService} from './web-storage.service';
import {TransferOrder} from './checkout.service';

export interface SalesOrder {
  documentId: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  placedAt: string;
  grandTotal: string;
  currency: string;
  items: {name: string; sku: string; quantity: number; unitPrice: string; lineTotal: string; image?: string}[];
  payment: {status: string; reference?: string; submittedAt?: string | null} | null;
}

export interface SalesOrderPage {
  data: SalesOrder[];
  meta: {pagination: {page: number; pageSize: number; total: number; pageCount: number}};
  summary: {billTotal: string; verifiedRevenue: string; currency: string};
}

@Injectable({providedIn: 'root'})
export class SalesHistoryService {
  private readonly url = `${environment.strapiUrl}/api/checkout/admin/orders`;

  constructor(private readonly http: HttpClient, private readonly storage: WebStorageService) {}

  private headers(): HttpHeaders {
    const token = this.storage.getSession('jwtResponse')?.token;
    return token ? new HttpHeaders({Authorization: `Bearer ${token}`}) : new HttpHeaders();
  }

  list(page = 1, search = '', status = ''): Observable<SalesOrderPage> {
    let params = new HttpParams().set('page', page).set('pageSize', 12);
    if (search.trim()) params = params.set('search', search.trim());
    if (status) params = params.set('status', status);
    return this.http.get<SalesOrderPage>(this.url, {headers: this.headers(), params});
  }

  approve(documentId: string): Observable<{data: TransferOrder}> {
    return this.http.post<{data: TransferOrder}>(
      `${this.url}/${encodeURIComponent(documentId)}/approve`, {}, {headers: this.headers()});
  }

  receiptUrl(documentId: string): string {
    return `${environment.strapiUrl}/api/checkout/review/${encodeURIComponent(documentId)}/receipt`;
  }

  downloadReceipt(documentId: string): Observable<Blob> {
    return this.http.get(this.receiptUrl(documentId), {headers: this.headers(), responseType: 'blob'});
  }
}
