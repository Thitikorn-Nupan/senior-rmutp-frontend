import {Injectable, signal} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable, tap} from 'rxjs';
import {environment} from '../../environments/environment';
import {WebStorageService} from './web-storage.service';

export interface ProfileAddress {
  addressLine1: string; addressLine2: string; subdistrict: string; district: string;
  province: string; postalCode: string; countryCode: string;
}
export interface ProfileInput {
  firstName: string; lastName: string; displayName: string; phone: string;
  shippingAddress: ProfileAddress;
}
export interface UserProfile extends Omit<ProfileInput, 'shippingAddress'> {
  documentId: string; email: string; username: string;
  avatar: {id: number; url: string} | null;
  shippingAddress: ProfileAddress | null;
}

@Injectable({providedIn: 'root'})
export class ProfileService {
  private readonly currentProfile = signal<UserProfile | null>(null);
  readonly profile = this.currentProfile.asReadonly();
  private readonly url = `${environment.strapiUrl}/api/profile/me`;
  constructor(private readonly http: HttpClient, private readonly storage: WebStorageService) {}
  private headers(): HttpHeaders {
    return new HttpHeaders({Authorization: `Bearer ${this.storage.getSession('jwtResponse')?.token ?? ''}`});
  }
  clear(): void { this.currentProfile.set(null); }
  get(): Observable<{data: UserProfile}> {
    return this.http.get<{data: UserProfile}>(this.url, {headers: this.headers()})
      .pipe(tap(({data}) => this.currentProfile.set(data)));
  }
  save(data: ProfileInput): Observable<{data: UserProfile}> {
    return this.http.put<{data: UserProfile}>(this.url, {data}, {headers: this.headers()})
      .pipe(tap(({data}) => this.currentProfile.set(data)));
  }
  upload(file: File): Observable<{data: UserProfile}> {
    const data = new FormData(); data.append('avatar', file);
    return this.http.post<{data: UserProfile}>(`${this.url}/avatar`, data, {headers: this.headers()})
      .pipe(tap(({data}) => this.currentProfile.set(data)));
  }
  removeAvatar(): Observable<{data: UserProfile}> {
    return this.http.delete<{data: UserProfile}>(`${this.url}/avatar`, {headers: this.headers()})
      .pipe(tap(({data}) => this.currentProfile.set(data)));
  }
  avatarUrl(avatar: UserProfile['avatar']): string {
    return avatar ? new URL(avatar.url, environment.strapiUrl).href : '';
  }
}
