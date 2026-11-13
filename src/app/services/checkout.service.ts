import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {WebStorageService} from './web-storage.service';

export interface TransferItem { variantDocumentId: string; quantity: number; }
export interface CheckoutQuote {
  subtotal: string; shippingTotal: string; grandTotal: string; currency: string; totalQuantity: number;
  items: {variantDocumentId: string; name: string; quantity: number; unitPrice: string; lineTotal: string}[];
}
export interface CheckoutAddress {
  recipientName: string; phone: string; addressLine1: string; subdistrict: string;
  district: string; province: string; postalCode: string; countryCode: 'TH';
}
export interface TransferCheckout {
  customer: {firstName: string; lastName: string; email: string};
  shippingAddress: CheckoutAddress; billingAddress: CheckoutAddress;
  items: TransferItem[]; expectedTotal: string;
}
export interface TransferOrder {
  documentId: string; orderNumber: string; orderStatus: string; paymentStatus: string;
  subtotal: string; shippingTotal: string; grandTotal: string; currency: string; expiresAt: string;
  customerName: string; customerEmail: string; customerPhone: string;
  shippingAddress: CheckoutAddress; billingAddress: CheckoutAddress;
  placedAt?: string; discountTotal?: string; taxTotal?: string;
  carrier?: string; shippingTrackingNumber?: string; shippedAt?: string;
  items: {name: string; sku: string; quantity: number; unitPrice: string; lineTotal: string; image?: string}[];
  payment: {reference: string; method: string; status: string; receiptSubmitted: boolean; submittedAt: string | null};
}

export interface CustomerOrderSummary {
  documentId: string; orderNumber: string; orderStatus: string; paymentStatus: string;
  grandTotal: string; currency: string; placedAt: string; expiresAt: string | null; totalQuantity: number;
  items: {name: string; image?: string}[];
}
export interface CustomerOrderPage {
  data: CustomerOrderSummary[];
  meta: {pagination: {page: number; pageSize: number; pageCount: number; total: number}};
}

@Injectable({providedIn: 'root'})
export class CheckoutService {
  private readonly baseUrl = environment.strapiUrl + '/api/checkout';
  constructor(private readonly http: HttpClient, private readonly storage: WebStorageService) {}

  private headers(key?: string): HttpHeaders {
    const token = this.storage.getSession('jwtResponse')?.token;
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', 'Bearer ' + token);
    if (key) headers = headers.set('Idempotency-Key', key);
    return headers;
  }
  quote(items: TransferItem[]): Observable<{data: CheckoutQuote}> {
    return this.http.post<{data: CheckoutQuote}>(this.baseUrl + '/quote', {items}, {headers: this.headers()});
  }
  createTransfer(payload: TransferCheckout, key: string): Observable<{data: TransferOrder}> {
    return this.http.post<{data: TransferOrder}>(this.baseUrl + '/orders', payload, {headers: this.headers(key)});
  }
  findRequest(key: string): Observable<{data: TransferOrder}> {
    return this.http.get<{data: TransferOrder}>(this.baseUrl + '/requests/' + encodeURIComponent(key), {headers: this.headers()});
  }
  getOrder(id: string): Observable<{data: TransferOrder}> {
    return this.http.get<{data: TransferOrder}>(this.baseUrl + '/orders/' + encodeURIComponent(id), {headers: this.headers()});
  }
  history(page = 1, search = '', status = ''): Observable<CustomerOrderPage> {
    return this.http.get<CustomerOrderPage>(this.baseUrl + '/orders', {
      headers: this.headers(), params: {page, pageSize: 10, search, status}
    });
  }
  submitReceipt(id: string, file: File): Observable<{data: TransferOrder}> {
    const form = new FormData();
    form.append('files', file, file.name);
    return this.http.post<{data: TransferOrder}>(this.baseUrl + '/orders/' + encodeURIComponent(id) + '/receipt', form, {headers: this.headers()});
  }
}
