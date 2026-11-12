import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {District} from "../entities/addresses/district";
import {Province} from "../entities/addresses/province";
import {environment} from "../../environments/environment.development";

@Injectable({
  providedIn: 'root'
})
export class AddressesService {

  private readonly baseUrlProvince = environment.baseUrl+'/province'
  private readonly baseUrlDistrict = environment.baseUrl+'/district'

  constructor(private readonly http: HttpClient) { }

  public getProvinces() : Observable<Province[]> {
    return this.http.get<Province[]>(`${this.baseUrlProvince}/selectAll`)
  }

  public getDistrictsByProvinceId (pid : number) : Observable<District[]> {
    return this.http.get<District[]>(`${this.baseUrlDistrict}/selectAllByProvinceId?pid=${pid}`)
  }

  public getDistrictsByProvinceName (name : string) : Observable<District[]> {
    return this.http.get<District[]>(`${this.baseUrlDistrict}/selectAllByProvinceName?name=${name}`)
  }

}
