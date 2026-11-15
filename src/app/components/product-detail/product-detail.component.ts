import {Component, OnDestroy, OnInit} from '@angular/core';
import {catchError, of, Subscription, switchMap, tap} from 'rxjs';
import {Product} from "../../entities/items/product";
import {CartStatusService} from "../../services/cart-status.service";
import {ActivatedRoute} from "@angular/router";
import {ProductsService} from "../../services/products.service";
import {CartItem} from "../../entities/purchase/cart-item";
import {selectProductVariant} from '../../services/catalog-api';
import {AlertService} from '../../services/alert.service';
import {MenuLanguageService} from '../../services/menu-language.service';
import {customerProductMessages} from './customer-product.messages';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css', './product-variants.css']
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  protected errorMessage = '';
  private request?: Subscription;
  protected product?: Product;

  constructor(private readonly cartStatusService: CartStatusService,
              private readonly activatedRoute: ActivatedRoute,
              private readonly productsService: ProductsService,
              public readonly language: MenuLanguageService,
              private readonly alerts: AlertService) {
  }

  get t() {
    return customerProductMessages[this.language.language()];
  }

  get canAdd(): boolean {
    if (!this.product?.variantDocumentId || this.product.unitInStock <= 0) return false;
    const inCart = this.cartStatusService.cartItems.find(item => item.variantDocumentId === this.product?.variantDocumentId)?.quantity ?? 0;
    return inCart < this.product.unitInStock;
  }

  protected chooseVariant(id: string): void {
    if (this.product) this.product = selectProductVariant(this.product, id);
  }

  async ngOnInit(): Promise<void> {
    // await this.delay(1000)
    // this.loadProduct()
    this.loadProduct();
  }

  private loadProduct() {
    // *** check param in this case param is id
    this.request = this.activatedRoute.paramMap.pipe(
      tap(() => {
        this.product = undefined;
        this.errorMessage = '';
      }),
      switchMap(params => this.productsService.getProductById(params.get('id') ?? '').pipe(
        catchError(error => {
          this.errorMessage = error.status === 404 ? this.t.notFound : this.t.retry;
          return of(null);
        })
      ))
    ).subscribe({
      next: product => {
        this.product = product ?? undefined;
      },
    });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  protected addItem(product: Product) {
    if (!this.canAdd) {
      this.alerts.show({header: this.t.limit, detail: this.t.limitDetail, status: 'warning'});
      return;
    }
    const cartItem: CartItem = new CartItem(product)
    const added = this.cartStatusService.addItemToCart(cartItem);
    this.alerts.show(added
      ? {header: this.t.added, detail: `${product.name} · ${product.variantLabel || product.sku}`, status: 'success'}
      : {header: this.t.limit, detail: this.t.limitDetail, status: 'warning'});
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

}
