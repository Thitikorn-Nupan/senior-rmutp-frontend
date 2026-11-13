import {Injectable} from '@angular/core';
import {CartItem} from "../entities/purchase/cart-item";
import {ReplaySubject, Subject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class CartStatusService {

  public cartItems : CartItem[] = []

  // *** will replay events for new subscriber who join later
  public totalPrice : Subject<number> = new ReplaySubject<number>()
  public totalQuantity : Subject<number> = new ReplaySubject<number>()

  // *** local storage it's very good store orders history
  private storage : Storage = localStorage
  private readonly keyStorage = 'CURRENT_CART_ITEM'


  constructor() {
    this.loadStorage()
  }

  private loadStorage() {
    // read data from local storage *** JSON.parse() read json string then convert to object ** getItem(<key>) get value then convert
    let data = JSON.parse(this.storage.getItem(this.keyStorage)!); // key can be any name
    /*
      Array(2)
      {id: 1, name: 'Crash Course in Python', imageUrl: 'assets/images/products/books/book-luv2code-1000.png', unitPrice: 314.99, quantity: 4}
      {id: 51, name: 'Mouse Pad - Express', imageUrl: 'assets/images/products/mousepads/mousepad-luv2code-1000.png', unitPrice: 517.99, quantity: 2}
      length
      [[Prototype]]
      ...
    */
    if (data != null) {
      // *** get data (array) to cartItems
      this.cartItems = data
      // compute cart
      this.computeCart()
    }
  }

  public addItemToCart(cartItem : CartItem) {

    let alreadyExistInCart : boolean = false
    let existingCartItem : CartItem | undefined = undefined // if existingCartItem changes this.cartItems[existingCartItem] changes
    // check if cart items have some items
    if (this.cartItems.length > 0) { // first won't do ,second case will do

      // find item base on id
      for (const itemEachCart of this.cartItems) {

        if (itemEachCart.variantDocumentId && cartItem.variantDocumentId
          ? itemEachCart.variantDocumentId === cartItem.variantDocumentId
          : itemEachCart.pid === cartItem.pid) {
          existingCartItem = itemEachCart
          break;
        }

      }
      // check if we found it
      alreadyExistInCart = (existingCartItem! != undefined)
    }

    if (alreadyExistInCart) {
      existingCartItem!.variantDocumentId ??= cartItem.variantDocumentId;
      existingCartItem!.documentId ??= cartItem.documentId;
      // increment quantity
      existingCartItem!.quantity ++
    } else  {
      // add i tem to array
      this.cartItems.push(cartItem)
    }
    this.computeCart()
  }


  public decrementItemOnCart(cartItem: CartItem) {
    cartItem.quantity--
    if (cartItem.quantity === 0) {
      this.removeItemOnCart(cartItem)
    } else {
      this.computeCart()
    }
  }

  public removeItemOnCart(cartItem: CartItem) {
    // first match id (get index of item)
    const itemIndex = this.cartItems.findIndex(currentCartItem => currentCartItem.pid === cartItem.pid)
    // if found
    if (itemIndex >= 0) {
      this.cartItems.splice(itemIndex, 1);
      // we have to delete one cart items from all cart items then *** compute all way
      this.computeCart()
    }
  }


  public computeCart(){
    // **
    let totalPrice : number = 0
    let totalQuantity : number = 0

    // ** loop for setting this.totalPrice,this.totalQuantity (Follow local storage)
    for (const currentItem of this.cartItems) {
      totalPrice += currentItem.quantity * currentItem.price
      totalQuantity += currentItem.quantity

    }

    // now totalPrice,totalQuantity already to use
    // ******
    // publish values
    // ******
    // .next() is sending event or publish event ,So now we can get this.totalPrice,this.totalQuantity
    // by this.totalPrice.subscript(() => ... )

    this.totalPrice.next(totalPrice)
    this.totalQuantity.next(totalQuantity)

    // persist (v. คงอยู่) cart items
    this.persistCartItems()
  }

  // ****** for local storage
  public persistCartItems() {
    // JSON.stringify() convert object to string
    let value = JSON.stringify(this.cartItems)
    // setItem(<key>,<value>) value it's important cause when we get this key we can change string to object then convert to cartItems array
    this.storage.setItem(this.keyStorage,value)
  }

}
