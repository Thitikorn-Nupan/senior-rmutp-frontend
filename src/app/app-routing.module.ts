import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {LoginFormComponent} from "./components/login-form/login-form.component";
import {RegisterFormComponent} from "./components/register-form/register-form.component";
import {ProductsComponent} from "./components/products/products.component";
import {CartDetailComponent} from "./components/cart-detail/cart-detail.component";
import {ProductDetailComponent} from "./components/product-detail/product-detail.component";
import {CheckoutFormComponent} from "./components/checkout-form/checkout-form.component";
import {OrdersHistoryComponent} from "./components/orders-history/orders-history.component";
import {OrderHistoryAdminComponent} from "./components/order-history-admin/order-history-admin.component";
import {AuthGuardRouter} from "./guards/auth-guard-router.service";
import { OrderHistoryOnlyPerfumesAdminComponent } from "./components/order-history-only-perfumes-admin/order-history-only-perfumes-admin.component";
import {AddProductComponent} from "./components/add-product/add-product.component";
import {ProductsAdminComponent} from "./components/products-admin/products-admin.component";

const routes: Routes = [
  {path: 'login', component: LoginFormComponent, canActivate: [AuthGuardRouter]},
  {path: 'register', component: RegisterFormComponent},
  {path: 'add-product', component: AddProductComponent, canActivate:[AuthGuardRouter]},
  {path: 'product-admin', component: ProductsAdminComponent, canActivate:[AuthGuardRouter]},
  {path: 'products', component: ProductsComponent},
  {path: 'category/:id', component: ProductsComponent},
  {path: 'cart-detail', component: CartDetailComponent},
  {path: 'product-detail/:id', component: ProductDetailComponent},
  {path: 'checkout', component: CheckoutFormComponent, canActivate:[AuthGuardRouter]},
  {path: 'orders-history', component: OrdersHistoryComponent, canActivate: [AuthGuardRouter]},
  {path: 'orders-history-admin', component: OrderHistoryAdminComponent, canActivate: [AuthGuardRouter]},
  {path: 'orders-history-only-perfumes-admin', component: OrderHistoryOnlyPerfumesAdminComponent,  canActivate: [AuthGuardRouter]},
  {path: '', redirectTo: '/products', pathMatch: 'full'}, //  ** first cases
  {path: '**', redirectTo: '/products', pathMatch: 'full'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)], //, {useHash: true}) easier for deploy
  exports: [RouterModule]
})
export class AppRoutingModule {
}
