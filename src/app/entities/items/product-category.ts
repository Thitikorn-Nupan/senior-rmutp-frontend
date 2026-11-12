export class ProductCategory {
  public pcId : number;
  public categoryName : string;

  constructor(id: number, categoryName: string) {
    this.pcId = id;
    this.categoryName = categoryName;
  }
}
