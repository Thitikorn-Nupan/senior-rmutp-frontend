export class OrderHistoryAdmin {
  public oid : string
  public orderTrackingNumber : string
  public totalPrice : number
  public totalQuantity : number
  public email : string
  public imageUrl : string
  public sku : string
  public name : string
  public quantity : number
  public price : number
  public dateCreated : Date
  public statusPurchase : boolean
  public qrPurchaseUrl : string
  public fileCode : string


  constructor(oid: string, orderTrackingNumber: string, totalPrice: number, totalQuantity: number, email: string, imageUrl: string, sku: string, name: string, quantity: number, price: number, dateCreated: Date,statusPurchase: boolean,qrPurchaseUrl: string,fileCode : string) {
    this.oid = oid;
    this.orderTrackingNumber = orderTrackingNumber;
    this.totalPrice = totalPrice;
    this.totalQuantity = totalQuantity;
    this.email = email;
    this.imageUrl = imageUrl;
    this.sku = sku;
    this.name = name;
    this.quantity = quantity;
    this.price = price;
    this.dateCreated = dateCreated;
    this.statusPurchase = statusPurchase;
    this.qrPurchaseUrl = qrPurchaseUrl;
    this.fileCode = fileCode
  }
}
