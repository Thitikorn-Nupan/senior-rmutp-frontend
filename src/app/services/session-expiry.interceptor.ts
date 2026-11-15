import {Injectable} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable, tap} from 'rxjs';
import {WebStorageService} from './web-storage.service';
import {environment} from '../../environments/environment';

@Injectable()
export class SessionExpiryInterceptor implements HttpInterceptor {
  constructor(private readonly storage: WebStorageService) {
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.storage.getSession('jwtResponse')?.token;
    const backend = [environment.strapiUrl, environment.baseUrl].some(base => request.url.startsWith(base + '/'));
    const authenticated = backend && !!token && request.headers.get('Authorization') === `Bearer ${token}`;
    return next.handle(request).pipe(tap({
      error: (error: unknown) => {
        if (authenticated && error instanceof HttpErrorResponse && error.status === 401) {
          // Let component error handlers finish so the session warning is displayed last.
          // Ignore late responses belonging to a previous login.
          queueMicrotask(() => this.storage.expireSession(token));
        }
      }
    }));
  }
}
