import {Component, OnInit} from '@angular/core';
import {CartItem} from "../../entities/purchase/cart-item";
import {CartStatusService} from "../../services/cart-status.service";

@Component({
  selector: 'app-cart-detail',
  templateUrl: './cart-detail.component.html',
  styleUrl: './cart-detail.component.css'
})
export class CartDetailComponent implements OnInit {

  protected totalPrice: number = 0.0
  protected totalQuantity: number = 0
  protected declare cartItems: CartItem[]

  constructor(private readonly cartStatusService: CartStatusService,) {}

  ngOnInit(): void {
    this.loadCartDetail()
  }

  private loadCartDetail() : void {
    // get a handle to the cart item
    this.cartItems = this.cartStatusService.cartItems
    // subscribe all total details
    this.cartStatusService.totalPrice.subscribe(response => (this.totalPrice = response))
    this.cartStatusService.totalQuantity.subscribe(response => (this.totalQuantity = response))
    // computeCart() it computes for this.totalPrice , this.totalQuantity
    // why use because we have methods for (click) angular we have to update total price,quantity
    this.cartStatusService.computeCart()
  }

  protected incrementQuantity(cartItem: CartItem) : void {
    this.cartStatusService.addItemToCart(cartItem)
  }

  protected decrementQuantity(cartItem: CartItem): void {
    this.cartStatusService.decrementItemOnCart(cartItem)
  }

  protected removeItem(cartItem: CartItem): void {
    this.cartStatusService.removeItemOnCart(cartItem)
  }

}
