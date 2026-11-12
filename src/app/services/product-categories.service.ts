import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment.development";
import {ProductCategory} from "../entities/items/product-category";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ProductCategoriesService {

  private readonly baseUrl : string = environment.baseUrl+'/productCategory';

  constructor(private readonly http: HttpClient) { }

  public getProductCategories() : Observable<ProductCategory[]> {
    return this.http.get<ProductCategory[]>(`${this.baseUrl}/selectAll`)
  }

}
