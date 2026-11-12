import {Injectable} from '@angular/core';
import {User} from "../entities/user";
import * as jwt_decode from "jwt-decode";
import {JwtResponse} from "../entities/register/jwt-response";

// if i mark this @Injectable annotation
// i don't need to create instance on own just do on constructor as (private webStorageService : WebStorageService)
@Injectable({
  providedIn: 'root'
})
export class WebStorageService {

  public getTokenExpiry(): number | null {
    const jwtResponse = this.getSession("jwtResponse");
    if (jwtResponse) {
      const payload = jwt_decode.jwtDecode(jwtResponse.token)
      if (payload.exp) {
        return payload.exp;
      }
      return null;
    }
    else {
      return null;
    }
  }

  public getUserFormToken() : User | null{
    const jwtResponse = this.getSession("jwtResponse");
    if (jwtResponse) {
      const payload : any = jwt_decode.jwtDecode(jwtResponse.token)
      return payload['user'];
    }
    else {
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
    const jwtResponse : JwtResponse = JSON.parse(sessionStorage.getItem(key)!)!;
    if (jwtResponse) {
      return jwtResponse;
    } else {
      return null
    }
  }

  public setSession(key: string, value: any): void {
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  public clearSession() {
    sessionStorage.clear();
    window.location.reload();
  }
}
