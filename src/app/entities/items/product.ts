export class Product {
  public pid: number
  public sku: string
  public name: string
  public description: string
  public price: number
  public imageUrl: string
  public unitInStock: number
  public pcId!: number

  constructor(pid: number, sku: string, name: string, description: string, price: number, imageUrl: string, unitInStock: number) {
    this.pid = pid;
    this.sku = sku;
    this.name = name;
    this.description = description;
    this.price = price;
    this.imageUrl = imageUrl;
    this.unitInStock = unitInStock;
  }

  public setPcId(pid: number) {
    this.pcId = pid;
    return this
  }
}
