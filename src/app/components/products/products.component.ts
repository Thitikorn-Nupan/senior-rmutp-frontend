import {Component, OnInit} from '@angular/core';
import {Product} from "../../entities/items/product";
import {ProductsService} from "../../services/products.service";
import {ActivatedRoute, Router} from "@angular/router";
import {CartStatusService} from "../../services/cart-status.service";
import {CartItem} from "../../entities/purchase/cart-item";
import {FormControl, FormGroup, Validators} from "@angular/forms";

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit{

  protected declare productsByPageNumber: Product[]
  protected declare totalPageNumber: number
  protected pageSelected: number = 1
  protected declare products: Product[]
  protected declare form: FormGroup;
  protected enableForm: boolean = false;
  protected preventCategoryId: number = 1;
  protected currentCategoryId: number = 1;


  constructor(private readonly productsService: ProductsService,
              private readonly activatedRoute: ActivatedRoute,
              private readonly cartStatusService : CartStatusService,
              private readonly router:Router) {
  }

  async ngOnInit(): Promise<void> {
    // Old way
    // await this.delay(800)
    // this.loadProducts()
    // My new
    this.form = new FormGroup({name: new FormControl(null,Validators.required)})
    await this.delay(800).then(() => (this.loadProducts()))
  }


  private loadProducts() : void {
    this.activatedRoute.params.subscribe(() : void  => {
      const checkParamIsExist : boolean = this.activatedRoute.snapshot.paramMap.has('id')
      if (checkParamIsExist) {
        this.currentCategoryId = Number(this.activatedRoute.snapshot.paramMap.get('id'))
      }
      this.preventCategoryId = this.currentCategoryId
      this.loadProductsByCategory()
    })
  }

  protected search() : void {
    if (this.form.valid) {
      const name = this.form.get('name')?.value;
      this.searchProductsByName(name)
    }
    else {
      this.loadProductsByCategory()
    }
  }

  protected clear() : void {
    this.loadProductsByCategory()
  }

  private searchProductsByName(name:string): void {
    this.productsService.getProductByLikeName(name).subscribe((products: Product[]) => {
      this.products = products
      this.totalPageNumber = this.products.length
      this.pageSelected = 1
      this.manageProductsByPage(this.pageSelected)
    })

  }

  protected addItem(product: Product) : void  {
    const cartItem : CartItem = new CartItem(product)
    this.cartStatusService.addItemToCart(cartItem) // ****
  }

  protected onSwitchMode(): void  {
    this.enableForm = !this.enableForm
  }

  protected seeDetail(pid: number) : void {
    this.router.navigate(['product-detail',pid])
  }

  private loadProductsByCategory(): void  {
    this.productsService.getProductsByCategoryByObservable(this.currentCategoryId)?.subscribe((products:Product[]) => {
      this.products = products
      this.totalPageNumber = this.products.length
      this.pageSelected = 1
      this.manageProductsByPage(this.pageSelected)
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Auto Way With Algorithm
  private manageProductsByPage(page: number): void {
    setTimeout(() => {
      const pageSize: number = 6
      let start: number = (page - 1) * pageSize
      let end: number = start + pageSize - 1
      let productsHolds: Product[] = this.products;
      this.productsByPageNumber = []
      for (let i: number = start; i <= end; i++) {
        if (page == this.getTotalPageNumberAsArray().length) { //
          end = this.products.length - 1
        }
        this.productsByPageNumber.push(productsHolds[i])
      }
    },500)
  }

  protected setPageNumberSelect(page: number): void {
    this.pageSelected = page
    this.manageProductsByPage(this.pageSelected)
  }

  protected getTotalPageNumberAsArray(): number[] {
    // Math.ceil() Up (to the ceiling) if data have decimal ex, 1.1 => 2 , 1.2 => 2
    let totalPage: number = Math.ceil(this.totalPageNumber / 6);
    let arrayTotal: number[] = [];
    for (let i: number = 1; i <= totalPage; i++) {
      arrayTotal.push(i);
    }
    return arrayTotal;
  }

  protected onUpdatePagePagination(condition: 'P' | 'N'): void {
    if (condition == 'P') {
      this.pageSelected -= 1
    } else {
      this.pageSelected += 1
    }
    this.manageProductsByPage(this.pageSelected)
  }

}
