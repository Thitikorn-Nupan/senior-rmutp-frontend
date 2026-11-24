import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {WebStorageService} from './web-storage.service';

export interface FragranceCategory { documentId: string; name: string; description: string; sortOrder: number; isActive: boolean; productCount: number; }
export interface FragranceCategoryInput { name: string; description: string; sortOrder: number; isActive: boolean; }

@Injectable({providedIn: 'root'})
export class FragranceCategoryManagementService {
  private readonly url = `${environment.strapiUrl}/api/management/categories`;
  constructor(private readonly http: HttpClient, private readonly storage: WebStorageService) {}
  private headers(): HttpHeaders { return new HttpHeaders({Authorization: `Bearer ${this.storage.getSession('jwtResponse')?.token ?? ''}`}); }
  list(): Observable<{data: FragranceCategory[]}> { return this.http.get<{data: FragranceCategory[]}>(this.url, {headers: this.headers()}); }
  save(id: string | undefined, data: FragranceCategoryInput): Observable<{data: FragranceCategory}> { return id ? this.http.put<{data: FragranceCategory}>(`${this.url}/${encodeURIComponent(id)}`, {data}, {headers: this.headers()}) : this.http.post<{data: FragranceCategory}>(this.url, {data}, {headers: this.headers()}); }
  delete(id: string): Observable<unknown> { return this.http.delete(`${this.url}/${encodeURIComponent(id)}`, {headers: this.headers()}); }
}
