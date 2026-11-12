import {Component, OnInit} from '@angular/core';
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
export class ProductDetailComponent implements OnInit {

  protected declare product: Product;

  constructor(private readonly cartStatusService: CartStatusService,
              private readonly activatedRoute: ActivatedRoute,
              private readonly productsService: ProductsService) {
  }

  async ngOnInit(): Promise<void> {
    // await this.delay(1000)
    // this.loadProduct()
    await this.delay(1000).then(() => (this.loadProduct()))
  }

  private loadProduct() {
    // *** check param in this case param is id
    this.activatedRoute.params.subscribe(
      () => {
        const checkParamIsExist = this.activatedRoute.snapshot.paramMap.has('id') // has(<key>) is a True if the map contains the given parameter, false otherwise
        if (checkParamIsExist) {
          const id : number = Number(this.activatedRoute.snapshot.paramMap.get('id'))
          this.productsService.getProductById(id).subscribe(response => (this.product = response))
        }
      })
  }

  protected addItem(product: Product) {
    const cartItem: CartItem = new CartItem(product)
    this.cartStatusService.addItemToCart(cartItem) // ****
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

}
