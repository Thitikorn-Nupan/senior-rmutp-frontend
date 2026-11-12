import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import { Observable} from "rxjs";
import {environment} from "../../environments/environment.development";
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
    return this.http.post<JwtResponse>(`${this.baseUrl}/login`,login)
  }

}
