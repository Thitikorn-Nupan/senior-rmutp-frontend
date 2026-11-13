import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from "@angular/common/http";
import {environment} from "../../environments/environment";
import {EMPTY, Observable, expand, map, reduce} from "rxjs";
import {CatalogPage, CatalogProduct, toProduct} from './catalog-api';
import { Product } from '../entities/items/product';
import {WebStorageService} from "./web-storage.service";
import {JwtResponse} from "../entities/register/jwt-response";

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private readonly baseUrl = environment.baseUrl+'/product';
  private jwtResponse : JwtResponse;

  constructor(private readonly http: HttpClient,
              private readonly webStorageService: WebStorageService) {
    // Work too
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
  }

  public getProductsByCategoryByObservable (id : number) : Observable<Product[]> {
    return this.getCatalog(id ? new HttpParams().set('category', id) : new HttpParams());
  }

  public getProductByLikeName(name: string) : Observable<Product[]> {
    return this.getCatalog(new HttpParams().set('search', name));
  }

  public getProductById(id: number | string) : Observable<Product> {
    return this.http.get<{ data: CatalogProduct }>(`${environment.strapiUrl}/api/catalog/products/${encodeURIComponent(id)}`)
      .pipe(map(response => toProduct(response.data)));
  }

  private getCatalog(params: HttpParams): Observable<Product[]> {
    const fetchPage = (page: number) => this.http.get<CatalogPage>(
      `${environment.strapiUrl}/api/catalog/products`, { params: params.set('page', page).set('pageSize', 100) }
    );
    return fetchPage(1).pipe(
      expand(response => response.meta.pagination.page < response.meta.pagination.pageCount
        ? fetchPage(response.meta.pagination.page + 1) : EMPTY),
      map(response => response.data.map(toProduct)),
      reduce((all, products) => all.concat(products), [] as Product[])
    );
  }

  public addProduct(product:Product) : Observable<boolean> {
    const headers = new HttpHeaders({Authorization: `Bearer ${this.jwtResponse.token}`});
    return this.http.post<boolean>(`${this.baseUrl}/insertOne`,product,{headers})
  }

  public editProduct(product:Product) : Observable<boolean> {
    const headers = new HttpHeaders({Authorization: `Bearer ${this.jwtResponse.token}`});
    return this.http.put<boolean>(`${this.baseUrl}/updateOne`,product,{headers})
  }


}
