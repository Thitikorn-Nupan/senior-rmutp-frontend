import {
  ActivatedRouteSnapshot,
  CanActivate,
  GuardResult,
  MaybeAsync, Router,
  RouterStateSnapshot
} from '@angular/router';
import {Injectable} from "@angular/core";
import {JwtResponse} from "../entities/security/jwt-response";
import {WebStorageService} from "../services/web-storage.service";

// export const authCartGuard: CanActivateFn = (route, state) => {
//   return true;
// };

// Old Way
@Injectable({
  providedIn: 'root'
})
export class AuthGuardRouter implements CanActivate {

  constructor(private readonly router: Router,
              private readonly webStorageService: WebStorageService) {
  }

  // if return false won go to any path you set
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): MaybeAsync<GuardResult> {
    const user: any = this.webStorageService.getUserFormToken()
    const jwtResponse: JwtResponse = this.webStorageService.getSession("jwtResponse");
    const path: string = route.url[0].path
    if (path === 'checkout' && !user) {
      return this.router.createUrlTree(['/login'], {queryParams: {returnUrl: '/checkout'}});
    }
    if (jwtResponse !== null && path === 'login') { // case user still logged in
      this.router.navigate([''])
      return false
    } else if (jwtResponse === null && path === 'orders-history') { // case user still logged in
      this.router.navigate(['login'])
      return false
    } else if (user?.roles !== 'ROLE_ADMIN' && path === 'product-admin') { // case user still logged in
      this.router.navigate([''])
      return false
    } else if (user?.roles !== 'ROLE_ADMIN' && path === 'add-product') { // case user still logged in
      this.router.navigate([''])
      return false
    } else if (user?.roles !== 'ROLE_ADMIN' && path === 'orders-history-only-perfumes-admin') { // case user still logged in
      this.router.navigate([''])
      return false
    } else if (user?.roles !== 'ROLE_ADMIN' && path === 'orders-history-admin') { // case user still logged in
      this.router.navigate([''])
      return false
    }
    return true
  }

}
