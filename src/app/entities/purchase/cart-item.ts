import {Product} from "../items/product";

/* this cart for storing any products (assume is an array)*/

export class CartItem {
  public documentId?: string;
  public variantDocumentId?: string;
  public sku?: string;
  public variantLabel?: string;
  public availableStock?: number;

  public pid: number
  public name: string
  public imageUrl: string
  public price: number
  public quantity: number

  constructor(product: Product) {
    this.pid = product.pid;
    this.documentId = product.documentId;
    this.variantDocumentId = product.variantDocumentId;
    this.sku = product.sku;
    this.variantLabel = product.variantLabel;
    this.availableStock = product.unitInStock;
    this.name = product.name;
    this.imageUrl = product.imageUrl;
    this.price = product.price;
    this.quantity = 1;
  }

}
