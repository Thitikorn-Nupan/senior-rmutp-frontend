import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {WebStorageService} from "../../services/web-storage.service";
import {JwtResponse} from "../../entities/register/jwt-response";
import {User} from "../../entities/user";
import {ProductsService} from "../../services/products.service";
import {Product} from "../../entities/items/product";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {ProductCategoriesService} from "../../services/product-categories.service";
import {ProductCategory} from "../../entities/items/product-category";
import {FileService} from "../../services/file.service";

@Component({
  selector: 'app-products-admin',
  templateUrl: './products-admin.component.html',
  styleUrl: './products-admin.component.css'
})
export class ProductsAdminComponent implements OnInit {

  protected declare productCategories : ProductCategory[] ;
  protected declare productCategory : ProductCategory ;
  protected declare products: Product[]
  protected declare product: Product
  protected declare productForShowOnForm: Product
  protected declare user: User | null
  protected declare jwtResponse: JwtResponse

  protected currentCategoryId: number = 1;
  protected isToggle: boolean = false;

  protected declare form: FormGroup;
  @ViewChild('fileInput')
  protected fileInput!: ElementRef; // for reset
  protected declare file: File | undefined // for getting input type file
  protected isEnableForm: boolean = false;

  // ** Popup
  protected iconMode : 'WARN' | 'ERROR' | 'SUCCESS' = 'WARN';
  public visible : boolean = false;
  protected headerTitle : string = '';
  protected body! : string;


  constructor(private readonly webStorageService: WebStorageService,
              private readonly productService: ProductsService,
              private readonly productCategoriesService: ProductCategoriesService,
              private readonly fileService:FileService) {
  }

  async ngOnInit(): Promise<void> {
    this.user = this.webStorageService.getUserFormToken()
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
    this.form = new FormGroup({
      sku : new FormControl(null, [Validators.required]),
      name: new FormControl(null, [Validators.required]),
      description: new FormControl(null, [Validators.required]),
      price: new FormControl(null, [Validators.required]),
      unitInStock : new FormControl(null, [Validators.required]),
      productCategory : new FormControl(null, [Validators.required])
    })
    if (this.jwtResponse === null) {
      this.jwtResponse = new JwtResponse()
      this.jwtResponse.token = ''
    }
    // Old way
    // await this.delay(1000).then( async () => { // wait 1s. then do
    //   this.loadProductsCategories()
    //   await this.delay(500).then( async () => { // wait 0.5s then do
    //     this.loadProducts()
    //   })
    // })
    // My New
    await this.delay(1000) // wait 1 s.
      .then( async () => ( this.loadProductsCategories() )) // do
      .then( async () => await this.delay(500)  // wait 0.5 s
      .then( async () => ( this.loadProducts()) )) // do
  }

  private loadProductsCategories(): void {
    this.productCategoriesService.getProductCategories().subscribe(productCategories => {
      this.productCategories = productCategories
      this.productCategory = this.productCategories[0]
    })
  }

  private loadProducts(): void {
    this.currentCategoryId = this.productCategory.pcId
    this.loadProductsByCategory()
  }

  private loadProductsByCategory(): void {
    this.productService.getProductsByCategoryByObservable(this.currentCategoryId)?.subscribe(products => (this.products = products))
  }

  protected switch(productCategory:ProductCategory): void { // for sorting mode
    this.productCategory = productCategory
    this.loadProducts()
    this.toggle()
  }

  protected toggle(): void {
    this.isToggle = !this.isToggle
  }

  protected uploadFileToAttr(event: any): void {
    const file : File = event.target.files[0];
    if (file) {
      this.file = file
    }
  }

  protected enableEditForm(product: Product): void {
    this.product = product // for req
    // have to new instead if you not it'll work as two ways
    this.productForShowOnForm = new Product(this.product.pid,this.product.sku,this.product.name,this.product.description,this.product.price,this.product.imageUrl,this.product.unitInStock)
    this.form.patchValue({
      sku:this.product.sku,
      name:this.product.name,
      description:this.product.description,
      price:this.product.price,
      unitInStock:this.product.unitInStock,
      productCategory:this.product.pcId,
    })
    this.isEnableForm = true
  }

  protected edit(): void {
    if (this.form.valid) {
      let isStillEdit : boolean
      if (this.file) { // update with new image
        this.fileService.uploadProduct(this.file,this.product.pcId).subscribe(
          (resFile : {image: string , size:number ,fullName : string}) => {
          this.product.imageUrl = resFile.image; // set new image path
          isStillEdit = true
        }, (errorResponse) => {
          this.visible = true
          this.iconMode = 'ERROR'
          this.headerTitle = 'Upload New Image Perfume Failed'
          let detail = ''
          if (errorResponse['error']['message']) { // case invalid inputs as size
            detail = errorResponse['error']['message']
          } else { // case token expiry date
            detail = errorResponse['error']['description']
          }
          this.body = detail
          isStillEdit = false
        })
      }
      else if (this.file === undefined) { // case update with old file
        isStillEdit = true
      }
      // have to delay if you have a new image
      this.delay(1000).then(() => {
        if (isStillEdit) {
          const values = this.form.value
          // const sku = values['sku']
          // const name = values['name']
          // const description = values['description']
          // const price = values['price']
          // const unitInStock = values['unitInStock']
          // const pcId = values['productCategory']
          this.product.sku = values['sku']
          this.product.name = values['name']
          this.product.description = values['description']
          this.product.price = values['price']
          this.product.unitInStock = values['unitInStock']
          this.product.pcId = values['productCategory']

          // now can update with old/new image
          this.productService.editProduct(this.product).subscribe(
            (resProduct : boolean) => {
              if (resProduct) {
                this.visible = true
                this.iconMode = 'SUCCESS'
                this.headerTitle = 'UpdatedSuccessfully'
                this.body = 'UpdatedSuccessfully'
              }
            },
            (errorResponse) => {
              this.visible = true
              this.iconMode = 'ERROR'
              this.headerTitle = 'Update Perfume Failed'
              let detail = ''
              if (errorResponse['error']['message']) { // case invalid inputs
                detail = errorResponse['error']['message']
              } else { // case token expiry date
                detail = errorResponse['error']['description']
              }
              this.body = detail
            })
        } // end if
      }) // end delayed
    }
    else {
      this.visible = true
      this.iconMode = 'WARN'
      this.headerTitle = 'Update Failed'
      this.body = 'Inputs are invalid'
    }
  }

  protected setCloseEvent(): void {
    this.visible = false;
  }

  protected setOkEvent(): void {
    this.visible = false;
    if (this.body === 'The JWT token has expired') {
      this.webStorageService.clearSession()
    }
    if(this.iconMode === 'SUCCESS') {
      this.clear()
      this.loadProducts()
    }
  }

  protected clear() : void {
    this.productForShowOnForm.pid = 0;
    this.productForShowOnForm.imageUrl = ""
    this.form.reset()
    this.form.get('productCategory')?.setValue(this.productCategories[0].pcId)
    this.fileInput.nativeElement.value = null
    this.file = undefined
    this.isEnableForm = false
  }

  protected clearForm() : void {
    this.form.patchValue({
      sku:null,
      name:null,
      description:null,
      price:null,
      unitInStock:null,
      productCategory:this.productCategories[0].pcId,
    })
    this.fileInput.nativeElement.value = null
    this.file = undefined
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

}
