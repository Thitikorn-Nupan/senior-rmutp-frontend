import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {WebStorageService} from './web-storage.service';

export interface MemberOrder {
  documentId: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  placedAt: string;
  grandTotal: string;
  currency: string;
  items: {name: string; sku: string; quantity: number; unitPrice: string; lineTotal: string; image?: string}[];
}

export interface SystemMember {
  id: number;
  username: string;
  email: string;
  confirmed: boolean;
  createdAt: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  orderCount: number;
  orders: MemberOrder[];
}

export interface SystemMemberPage {
  data: SystemMember[];
  meta: {pagination: {page: number; pageSize: number; total: number; pageCount: number}};
}

@Injectable({providedIn: 'root'})
export class MemberManagementService {
  private readonly url = `${environment.strapiUrl}/api/checkout/admin/members`;

  constructor(private readonly http: HttpClient, private readonly storage: WebStorageService) {}

  list(page = 1, search = ''): Observable<SystemMemberPage> {
    let params = new HttpParams().set('page', page).set('pageSize', 12);
    if (search.trim()) params = params.set('search', search.trim());
    const token = this.storage.getSession('jwtResponse')?.token;
    const headers = token ? new HttpHeaders({Authorization: `Bearer ${token}`}) : new HttpHeaders();
    return this.http.get<SystemMemberPage>(this.url, {headers, params});
  }
}
