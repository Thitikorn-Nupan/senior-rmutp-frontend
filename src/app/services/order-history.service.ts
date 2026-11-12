import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {environment} from "../../environments/environment.development";
import {Observable} from "rxjs";
import {OrderHistory} from '../entities/orders-history/order-history';
import {OrderHistoryAdmin} from "../entities/orders-history-admin/order-history-admin";
import {WebStorageService} from "./web-storage.service";
import {JwtResponse} from "../entities/register/jwt-response";

@Injectable({
  providedIn: 'root'
})
export class OrderHistoryService {

  private readonly baseUrlOrderHistory = environment.baseUrl+'/orderForHistory';
  private readonly baseUrlOrder = environment.baseUrl+'/order';
  private jwtResponse : JwtResponse;

  constructor(private readonly http: HttpClient,
              private readonly webStorageService:WebStorageService) {
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
  }

  // Order History
  public getOrderHistoryOnlyPerfumesForAdmin(): Observable<OrderHistoryAdmin[]> {
    const headers = new HttpHeaders({Authorization: `Bearer ${this.jwtResponse.token}`});
    return this.http.get<OrderHistoryAdmin[]>(`${this.baseUrlOrderHistory}/selectAllPerfumesSell`, {headers});
  }

  public getOrderHistoryByEmail(username: string) : Observable<OrderHistory[]> {
    const headers = new HttpHeaders({Authorization: `Bearer ${this.jwtResponse.token}`});
    return this.http.get<OrderHistory[]>(`${this.baseUrlOrderHistory}/selectAllByEmail?email=${username}`, {headers});
  }

  public getOrderHistoryByTrackingNumber(trackingNumber: string) : Observable<OrderHistoryAdmin[]> {
    const headers = new HttpHeaders({Authorization: `Bearer ${this.jwtResponse.token}`});
    return this.http.get<OrderHistoryAdmin[]>(`${this.baseUrlOrderHistory}/selectAllByTrackingNumber?tracking=${trackingNumber}`, {headers});
  }

  public getOrdersHistoryForAdmin(): Observable<OrderHistoryAdmin[]> {
    const headers = new HttpHeaders({Authorization: `Bearer ${this.jwtResponse.token}`});
    return this.http.get<OrderHistoryAdmin[]>(`${this.baseUrlOrderHistory}/selectAll`, {headers});
  }

  // Order
  public updateStatusPurchaseForAdmin(orderTrackingNumber:string) : Observable<boolean> {
    const headers = new HttpHeaders({Authorization: `Bearer ${this.jwtResponse.token}`});
    return this.http.put<boolean>(`${this.baseUrlOrder}/updateStatusPurchase`,{'trackingNumber':orderTrackingNumber} ,{headers});
  }

  public downloadDocFile(type:'PDF'|'XLSX') : Observable<any> {
    const fileType : {fileExtension:string} = {
      fileExtension: type,
    }
    return this.http.post(`${this.baseUrlOrderHistory}/selectAllPerfumesSellReport`,fileType ,{
      observe: 'response', // Get the full HttpResponse
      responseType: 'blob' // Specify the response body type as a blob
    });
  }

  public downloadDocFileV2(type:'PDF'|'XLSX') : Observable<any> {
    const fileType : {fileExtension:string} = {
      fileExtension: type,
    }
    return this.http.post(`${this.baseUrlOrderHistory}/selectAllPerfumesSellReport.v2` ,fileType,{
      observe: 'response', // Get the full HttpResponse
      responseType: 'blob' // Specify the response body type as a blob
    });
  }



}
