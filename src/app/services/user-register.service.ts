import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {map, Observable} from "rxjs";
import {environment} from "../../environments/environment";
import {JwtResponse} from "../entities/security/jwt-response";
import {Login} from "../entities/register/login";

interface StrapiAuthResponse {
  jwt?: string;
  user: {
    id: number;
    username: string;
    role?: { id: number; name: string; type: string } | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserRegisterService {

  constructor(private readonly http: HttpClient) {}

  public signIn(login: Login): Observable<boolean> {
    const email : string = login.username.trim().toLowerCase();
    // Role is assigned by Strapi. Never submit a role from a public form.
    return this.http.post<StrapiAuthResponse>(`${environment.strapiUrl}/api/auth/local/register`, {username: email, email, password: login.password,}).pipe(map(response => Boolean(response.user?.id)));
  }

  public login(login: Login): Observable<JwtResponse> {
    return this.http.post<StrapiAuthResponse>(`${environment.strapiUrl}/api/auth/local`, {identifier: login.username.trim(), password: login.password}).pipe(map(response => {
      if (!response.jwt) throw new Error('The server did not return an access token');
      const role = response.user.role?.type === 'app-admin' ? 'ROLE_ADMIN' : 'ROLE_USER';
      const session = new JwtResponse(response.jwt, response.user.username, [role]);
      session.user = {uid: response.user.id, username: response.user.username, roles: role};
      return session;
    }));
  }

}
