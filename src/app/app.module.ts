import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {MenubarComponent} from './components/menubar/menubar.component';
import {RegistersStatusComponent} from './components/menubar/registers-status/registers-status.component';
import {LoginFormComponent} from './components/login-form/login-form.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {RegisterFormComponent} from './components/register-form/register-form.component';
import {HttpClientModule} from "@angular/common/http";
import {ProductsComponent} from './components/products/products.component';
import {ProductCategoriesComponent} from './components/menubar/product-categories/product-categories.component';
import {CartStatusComponent} from "./components/menubar/cart-status/cart-status.component";
import {CartDetailComponent} from './components/cart-detail/cart-detail.component';
import {ProductDetailComponent} from './components/product-detail/product-detail.component';
import {CheckoutFormComponent} from './components/checkout-form/checkout-form.component';
import {FooterComponent} from './components/footer/footer.component';
import {OrdersHistoryComponent} from './components/orders-history/orders-history.component';
import {OrderHistoryAdminComponent} from './components/order-history-admin/order-history-admin.component';
import {OrderHistoryOnlyPerfumesAdminComponent} from './components/order-history-only-perfumes-admin/order-history-only-perfumes-admin.component';
import { AddProductComponent } from './components/add-product/add-product.component';
import { ProductsAdminComponent } from './components/products-admin/products-admin.component';
import { PopUpComponent } from './components/pop-up/pop-up.component';

@NgModule({
  declarations: [
    AppComponent,
    MenubarComponent,
    RegistersStatusComponent,
    LoginFormComponent,
    RegisterFormComponent,
    ProductsComponent,
    ProductCategoriesComponent,
    CartStatusComponent,
    CartDetailComponent,
    ProductDetailComponent,
    CheckoutFormComponent,
    FooterComponent,
    OrdersHistoryComponent,
    OrderHistoryAdminComponent,
    OrderHistoryOnlyPerfumesAdminComponent,
    AddProductComponent,
    ProductsAdminComponent,
    PopUpComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
