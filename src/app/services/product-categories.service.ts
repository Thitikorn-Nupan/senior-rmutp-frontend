import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";
import {ProductCategory} from "../entities/items/product-category";
import {map, Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ProductCategoriesService {

  private readonly baseUrl : string = environment.baseUrl+'/productCategory';

  constructor(private readonly http: HttpClient) { }

  public getProductCategories() : Observable<ProductCategory[]> {
    return this.http.get<{ data: { id: number; name: string }[] }>(`${environment.strapiUrl}/api/catalog/categories`)
      .pipe(map(response => response.data.map(category => new ProductCategory(category.id, category.name))));
  }

}
