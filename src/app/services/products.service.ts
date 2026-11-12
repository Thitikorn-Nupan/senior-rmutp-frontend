import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {environment} from "../../environments/environment.development";
import {Observable} from "rxjs";
import { Product } from '../entities/items/product';
import {WebStorageService} from "./web-storage.service";
import {JwtResponse} from "../entities/register/jwt-response";

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private readonly baseUrl = environment.baseUrl+'/product';
  // Work too
  /*
  private readonly productsMale : Subject<Product[]> = new ReplaySubject<Product[]>();
  private readonly productsFemale : Subject<Product[]> = new ReplaySubject<Product[]>();
  private readonly productsUnisex : Subject<Product[]>  = new ReplaySubject<Product[]>();
  */

  private productsMale! : Observable<Product[]>;
  private productsFemale! : Observable<Product[]>;
  private productsUnisex! : Observable<Product[]>;
  private jwtResponse : JwtResponse;

  constructor(private readonly http: HttpClient,
              private readonly webStorageService: WebStorageService) {
    // Work too
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
    this.loadProductsToObservableProducts()
  }

  private loadProductsToObservableProducts() {
    this.productsMale = new Observable<Product[]>(observe => {
      this.http.get<Product[]>(`${this.baseUrl}/selectAllByProductCategoryID?pcId=1`).subscribe(response => {
        observe.next(response);
      })
    })

    this.productsFemale = new Observable<Product[]>(observe => {
      this.http.get<Product[]>(`${this.baseUrl}/selectAllByProductCategoryID?pcId=2`).subscribe(response => {
        observe.next(response);
      })
    })

    this.productsUnisex = new Observable<Product[]>(observe => {
      this.http.get<Product[]>(`${this.baseUrl}/selectAllByProductCategoryID?pcId=3`).subscribe(response => {
        observe.next(response);
      })
    })

  }

  public getProductsByCategoryByObservable (id : number) : Observable<Product[]> |null {
    if (id === 1) {
      return this.productsMale
    }
    else if (id === 2) {
      return this.productsFemale
    }
    else if (id===3) {
      return this.productsUnisex
    }
    return null
  }

  public getProductByLikeName(name: string) : Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/selectAllByLikeName?name=${name}`)
  }

  public getProductById(id: number) : Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/selectOne?pid=${id}`)
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
