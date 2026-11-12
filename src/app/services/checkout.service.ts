import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {PaymentInformation} from "../entities/payment/payment-information";
import {environment} from "../../environments/environment.development";
import {Checkout} from "../entities/purchase/checkout";
import {WebStorageService} from "./web-storage.service";
import {JwtResponse} from "../entities/register/jwt-response";

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {

  private readonly baseUrlCheckout = environment.baseUrl+'/checkout';
  private readonly baseUrlPayment = environment.baseUrl+'/payment';
  private jwtResponse : JwtResponse;

  constructor(private readonly http: HttpClient,
              private readonly webStorageService: WebStorageService) {
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
  }

  public createCheckout(checkout : Checkout): Observable<boolean> {
    return this.http.post<any>(`${this.baseUrlCheckout}/insertOne`, checkout);
  }

  public createPaymentIntent(paymentInformation : PaymentInformation): Observable<any> {
    return this.http.post<any>(`${this.baseUrlPayment}/generate`, paymentInformation);
  }



}
