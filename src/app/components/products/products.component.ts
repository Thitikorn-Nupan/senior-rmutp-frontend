import {Component, OnDestroy, OnInit} from '@angular/core';
import {forkJoin, map, Subscription, timer} from 'rxjs';
import {Product} from "../../entities/items/product";
import {ProductsService} from "../../services/products.service";
import {ActivatedRoute, Router} from "@angular/router";
import {CartStatusService} from "../../services/cart-status.service";
import {CartItem} from "../../entities/purchase/cart-item";
import {FormControl, FormGroup, Validators} from "@angular/forms";

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css', './products-loading.css']
})
export class ProductsComponent implements OnInit, OnDestroy{
  protected loading = true;
  protected errorMessage = '';
  protected cartMessage = '';
  protected readonly skeletonCards = [0, 1, 2, 3, 4, 5];
  private readonly minimumLoadingMs = 1000;
  private request?: Subscription;
  private routeSubscription?: Subscription;

  protected declare productsByPageNumber: Product[]
  protected declare totalPageNumber: number
  protected pageSelected: number = 1
  protected declare products: Product[]
  protected declare form: FormGroup;
  protected enableForm: boolean = false;
  protected preventCategoryId: number = 1;
  protected currentCategoryId: number = 0;


  constructor(private readonly productsService: ProductsService,
              private readonly activatedRoute: ActivatedRoute,
              private readonly cartStatusService : CartStatusService,
              private readonly router:Router) {
  }

  async ngOnInit(): Promise<void> {
    // Old way
    // await this.delay(800)
    // this.loadProducts()
    // My new
    this.form = new FormGroup({name: new FormControl(null,Validators.required)})
    this.loadProducts();
  }


  private loadProducts() : void {
    this.routeSubscription = this.activatedRoute.params.subscribe(() : void  => {
      const checkParamIsExist : boolean = this.activatedRoute.snapshot.paramMap.has('id')
      if (checkParamIsExist) {
        this.currentCategoryId = Number(this.activatedRoute.snapshot.paramMap.get('id'))
      } else {
        this.currentCategoryId = 0;
      }
      this.preventCategoryId = this.currentCategoryId
      this.loadProductsByCategory()
    })
  }

  protected search() : void {
    if (this.form.valid) {
      const name = this.form.get('name')?.value;
      this.searchProductsByName(name)
    }
    else {
      this.loadProductsByCategory()
    }
  }

  protected clear() : void {
    this.form.reset();
    this.loadProductsByCategory()
  }

  private searchProductsByName(name:string): void {
    this.loadRequest(this.productsService.getProductByLikeName(name));

  }

  protected addItem(product: Product) : void  {
    if (product.unitInStock <= 0) return;
    const cartItem : CartItem = new CartItem(product)
    this.cartStatusService.addItemToCart(cartItem) // ****
    this.cartMessage = `${product.name} added to your cart.`;
  }

  protected onSwitchMode(): void  {
    this.enableForm = !this.enableForm
  }

  protected seeDetail(pid: number | string) : void {
    this.router.navigate(['product-detail',pid])
  }

  private loadProductsByCategory(): void  {
    this.loadRequest(this.productsService.getProductsByCategoryByObservable(this.currentCategoryId));
  }

  private loadRequest(source: import('rxjs').Observable<Product[]>): void {
    this.request?.unsubscribe();
    this.loading = true;
    this.errorMessage = '';
    this.cartMessage = '';
    // Start the request and minimum display timer together. Unsubscribing cancels
    // both, so a previous category can never replace the latest selection.
    this.request = forkJoin([source, timer(this.minimumLoadingMs)]).pipe(
      map(([products]) => products)
    ).subscribe({
      next: products => {
        this.products = products;
        this.totalPageNumber = products.length;
        this.pageSelected = 1;
        this.manageProductsByPage(1);
        this.loading = false;
      },
      error: () => {
        this.products = [];
        this.productsByPageNumber = [];
        this.totalPageNumber = 0;
        this.loading = false;
        this.errorMessage = 'Unable to load products. Please try again.';
      }
    });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  // Auto Way With Algorithm
  private manageProductsByPage(page: number): void {
    this.productsByPageNumber = this.products.slice((page - 1) * 6, page * 6);
  }

  protected setPageNumberSelect(page: number): void {
    this.pageSelected = page
    this.manageProductsByPage(this.pageSelected)
  }

  protected getTotalPageNumberAsArray(): number[] {
    // Math.ceil() Up (to the ceiling) if data have decimal ex, 1.1 => 2 , 1.2 => 2
    let totalPage: number = Math.ceil(this.totalPageNumber / 6);
    let arrayTotal: number[] = [];
    for (let i: number = 1; i <= totalPage; i++) {
      arrayTotal.push(i);
    }
    return arrayTotal;
  }

  protected onUpdatePagePagination(condition: 'P' | 'N'): void {
    const target = this.pageSelected + (condition === 'P' ? -1 : 1);
    if (target < 1 || target > Math.ceil(this.totalPageNumber / 6)) return;
    if (condition == 'P') {
      this.pageSelected -= 1
    } else {
      this.pageSelected += 1
    }
    this.manageProductsByPage(this.pageSelected)
  }

}
