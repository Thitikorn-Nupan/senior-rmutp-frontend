import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subscription, switchMap} from 'rxjs';
import {Product} from "../../entities/items/product";
import {CartStatusService} from "../../services/cart-status.service";
import {ActivatedRoute} from "@angular/router";
import {ProductsService} from "../../services/products.service";
import {CartItem} from "../../entities/purchase/cart-item";

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  protected errorMessage = '';
  private request?: Subscription;

  protected declare product: Product;

  constructor(private readonly cartStatusService: CartStatusService,
              private readonly activatedRoute: ActivatedRoute,
              private readonly productsService: ProductsService) {
  }

  async ngOnInit(): Promise<void> {
    // await this.delay(1000)
    // this.loadProduct()
    this.loadProduct();
  }

  private loadProduct() {
    // *** check param in this case param is id
    this.request = this.activatedRoute.paramMap.pipe(
      switchMap(params => this.productsService.getProductById(params.get('id') ?? ''))
    ).subscribe({
      next: product => { this.product = product; },
      error: error => { this.errorMessage = error.status === 404 ? 'Product not found.' : 'Unable to load product. Please try again.'; }
    });
  }

  ngOnDestroy(): void { this.request?.unsubscribe(); }

  protected addItem(product: Product) {
    const cartItem: CartItem = new CartItem(product)
    this.cartStatusService.addItemToCart(cartItem) // ****
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

}
