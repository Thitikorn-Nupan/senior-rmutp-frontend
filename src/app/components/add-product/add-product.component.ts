import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ProductCategory} from "../../entities/items/product-category";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {ProductCategoriesService} from "../../services/product-categories.service";
import {Product} from "../../entities/items/product";
import {FileService} from "../../services/file.service";
import {ProductsService} from "../../services/products.service";

@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.css'
})
export class AddProductComponent implements OnInit {

  protected declare form: FormGroup;
  @ViewChild('fileInput')
  protected fileInput!: ElementRef; // for reset
  protected declare file: File | undefined // for getting input type file
  protected declare product: Product
  protected declare productCategories : ProductCategory[] ;

  // ** Popup
  protected iconMode : 'WARN' | 'ERROR' |'SUCCESS' = 'ERROR';
  public visible : boolean = false;
  protected headerTitle : string = '';
  protected body! : string;

  constructor(private readonly productCategoriesService : ProductCategoriesService,
              private readonly fileService: FileService,
              private readonly productService:ProductsService) {
  }

  ngOnInit(): void {
    this.form = new FormGroup({
      sku : new FormControl(null, [Validators.required]),
      name: new FormControl(null, [Validators.required]),
      description: new FormControl(null, [Validators.required]),
      price: new FormControl(null, [Validators.required]),
      unitInStock : new FormControl(null, [Validators.required]),
      productCategory : new FormControl(null, [Validators.required])
    })
    this.loadProductsCategories()
  }

  private loadProductsCategories(): void {
    this.productCategoriesService.getProductCategories().subscribe(productCategories => {
      this.productCategories = productCategories
      this.form.get('productCategory')?.setValue(productCategories[0].pcId)
    })
  }

  protected uploadFileToAttr(event: any): void {
    const file : File = event.target.files[0];
    if (file) {
      this.file = file
    }
  }

  protected add(): void {
    if (this.form.valid && this.file) {
      const values = this.form.value
      const sku = values['sku']
      const name = values['name']
      const description = values['description']
      const price = values['price']
      const unitInStock = values['unitInStock']
      const pcId = values['productCategory']
      this.fileService.uploadProduct(this.file,pcId).subscribe((resFile : {image: string , size:number ,fullName : string}) => {
        const product = new Product(0,sku, name, description, price,resFile.image, unitInStock).setPcId(pcId)
        this.productService.addProduct(product).subscribe(
          (resProduct) => {
            // (resProduct ? this.clear() : null)
            if (resProduct) {
              this.visible = true
              this.iconMode = 'SUCCESS'
              this.headerTitle = 'Add Perfume Successfully'
              this.body = 'Add Perfume Successfully'
            }
          } ,
          (errorResponse) => {
          this.visible = true
          this.iconMode = 'ERROR'
          this.headerTitle = 'Add Perfume Failed'
          let detail = ''
          if (errorResponse['error']['message']) { // case invalid inputs
            detail = errorResponse['error']['message']
          } else { // case token expiry date
            detail = errorResponse['error']['description']
          }
          this.body = detail
        })
      }, (errorResponse) => {
        this.visible = true
        this.iconMode = 'ERROR'
        this.headerTitle = 'Upload Image Perfume Failed'
        let detail = ''
        if (errorResponse['error']['message']) {  // case invalid inputs as size image
          detail = errorResponse['error']['message']
        } else { // case token expiry date
          detail = errorResponse['error']['description']
        }
        this.body = detail
      })
    } else {
      this.visible = true
      this.iconMode = 'WARN'
      this.headerTitle = 'Add Failed'
      this.body = 'Inputs are invalid'
    }
  }

  protected clear(): void {
    this.form.reset()
    this.form.get('productCategory')?.setValue(this.productCategories[0].pcId)
    this.fileInput.nativeElement.value = null
    this.file = undefined
  }

  protected setCloseEvent(): void {
    this.visible = false;
    if (this.iconMode==='SUCCESS') {
      this.clear()
    }
  }

  protected setOkEvent(): void {
    this.visible = false;
    if (this.iconMode==='SUCCESS') {
     this.clear()
    }
  }
}
