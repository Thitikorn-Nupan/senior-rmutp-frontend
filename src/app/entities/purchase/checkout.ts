import {Address} from "./address";
import {OrderItem} from "./order-item";
import {Order} from "./order";
import {Customer} from "./customer";

export class Checkout {
  public customer!: Customer
  public shippingAddress!: Address
  public billingAddress!: Address
  public order!: Order
  public orderItems!: OrderItem[]
}
