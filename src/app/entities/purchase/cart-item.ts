import {Product} from "../items/product";

/* this cart for storing any products (assume is an array)*/

export class CartItem {
  public documentId?: string;
  public variantDocumentId?: string;

  public pid: number
  public name: string
  public imageUrl: string
  public price: number
  public quantity: number

  constructor(product: Product) {
    this.pid = product.pid;
    this.documentId = product.documentId;
    this.variantDocumentId = product.variantDocumentId;
    this.name = product.name;
    this.imageUrl = product.imageUrl;
    this.price = product.price;
    this.quantity = 1;
  }

}
