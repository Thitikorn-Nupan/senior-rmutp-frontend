import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import { map, Observable} from "rxjs";
import {environment} from "../../environments/environment";
import {JwtResponse} from "../entities/security/jwt-response";
import {Login} from "../entities/register/login";


@Injectable({
  providedIn: 'root'
})
export class UserRegisterService {

  private readonly baseUrl = environment.baseUrl + '/register'

  constructor(private readonly http: HttpClient) { }

  public signIn(login : Login): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/signIn`, login)
  }

  public login(login : Login) : Observable<JwtResponse>  {
    return this.http.post<{ jwt: string; user: { id: number; username: string } }>(
      `${environment.strapiUrl}/api/auth/local`,
      { identifier: login.username.trim(), password: login.password }
    ).pipe(map(response => {
      const session = new JwtResponse(response.jwt, response.user.username, []);
      // Strapi customer accounts do not grant access to the legacy admin screens.
      session.user = { uid: response.user.id, username: response.user.username, roles: 'ROLE_USER' };
      return session;
    }));
  }

}
