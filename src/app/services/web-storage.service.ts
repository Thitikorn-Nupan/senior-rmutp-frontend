import {Injectable} from '@angular/core';
import {User} from "../entities/user";
import * as jwt_decode from "jwt-decode";
import {Subject} from 'rxjs';

// if i mark this @Injectable annotation
// i don't need to create instance on own just do on constructor as (private webStorageService : WebStorageService)
@Injectable({
  providedIn: 'root'
})
export class WebStorageService {
  private readonly changes = new Subject<void>();
  private readonly expired = new Subject<void>();
  readonly sessionChanges$ = this.changes.asObservable();
  readonly sessionExpired$ = this.expired.asObservable();

  public getTokenExpiry(): number | null {
    const jwtResponse = this.getSession("jwtResponse");
    if (jwtResponse) {
      let payload;
      try {
        payload = jwt_decode.jwtDecode(jwtResponse.token);
      } catch {
        this.expireSession(jwtResponse.token);
        return null;
      }
      if (payload && typeof payload.exp === 'number' && Number.isFinite(payload.exp) && payload.exp > 0) {
        return payload.exp;
      }
      this.expireSession(jwtResponse.token);
      return null;
    } else {
      return null;
    }
  }

  public getUserFormToken(): User | null {
    const jwtResponse = this.getSession("jwtResponse");
    if (jwtResponse) {
      const expiry = this.getTokenExpiry();
      if (!expiry || expiry * 1000 <= Date.now()) {
        this.expireSession(jwtResponse.token);
        return null;
      }
      if (jwtResponse.user) return jwtResponse.user;
      // Old sessions cannot authenticate with Strapi. Require a fresh login.
      this.expireSession(jwtResponse.token);
      return null;
    } else {
      return null;
    }
  }

  public getLocal(key: string): any {
    const itemStorage = localStorage.getItem(key);
    try {
      return itemStorage ? JSON.parse(itemStorage) : null;
    } catch (error) {
      return null;
    }
  }

  public setLocal(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  public remove(key: string): void {
    localStorage.removeItem(key);
  }

  public clear(): void {
    localStorage.clear();
  }

  public getSession(key: string): any {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? 'null');
    } catch {
      sessionStorage.removeItem(key);
      return null;
    }
  }

  public setSession(key: string, value: any): void {
    sessionStorage.setItem(key, JSON.stringify(value));
    if (key === 'jwtResponse') this.changes.next();
  }

  public expireSession(expectedToken?: string): boolean {
    const session = this.getSession('jwtResponse');
    if (!session || (expectedToken !== undefined && session.token !== expectedToken)) return false;
    sessionStorage.removeItem('jwtResponse');
    this.changes.next();
    this.expired.next();
    return true;
  }

  public clearSession() {
    sessionStorage.clear();
    this.changes.next();
  }
}
