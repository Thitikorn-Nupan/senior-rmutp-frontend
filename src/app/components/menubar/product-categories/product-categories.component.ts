import {Component, OnInit} from '@angular/core';
import {ProductCategory} from "../../../entities/items/product-category";
import {ProductCategoriesService} from "../../../services/product-categories.service";

import {MenuLanguageService} from "../../../services/menu-language.service";

@Component({
  selector: 'ecm-product-categories',
  templateUrl: './product-categories.component.html',
  styleUrl: './product-categories.component.css'
})
export class ProductCategoriesComponent implements OnInit {

  protected declare productCategories: ProductCategory[];

  constructor(private readonly productCategoriesService: ProductCategoriesService,
              public readonly menuLanguage: MenuLanguageService) {
  }

  ngOnInit(): void {
    this.loadProductsCategories()
  }

  private loadProductsCategories(): void {
    this.productCategoriesService.getProductCategories().subscribe({
      next: productCategories => {
        this.productCategories = productCategories;
      },
      error: () => {
        this.productCategories = [];
      }
    });
  }


}
