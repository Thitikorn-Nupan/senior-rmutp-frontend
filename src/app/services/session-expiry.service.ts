import {DestroyRef, Injectable, inject} from '@angular/core';
import {Router} from '@angular/router';
import {fromEvent, merge} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {WebStorageService} from './web-storage.service';
import {AlertService} from './alert.service';
import {MenuLanguageService} from './menu-language.service';
import {ProfileService} from './profile.service';

@Injectable({providedIn: 'root'})
export class SessionExpiryService {
  private readonly storage = inject(WebStorageService);
  private readonly alerts = inject(AlertService);
  private readonly language = inject(MenuLanguageService);
  private readonly profiles = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private timer?: ReturnType<typeof setTimeout>;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
    this.storage.sessionExpired$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.profiles.clear();
      const text = this.language.text();
      this.alerts.show({header: text.sessionExpiredTitle, detail: text.sessionExpiredDetail, status: 'warning'});
      // The global alert stays visible across navigation. The user signs in manually.
      void this.router.navigate(['/login'], {replaceUrl: true});
    });
    merge(this.storage.sessionChanges$, fromEvent(window, 'focus'), fromEvent(window, 'pageshow'),
      fromEvent(document, 'visibilitychange')).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.check());
    this.check();
  }

  private check(): void {
    clearTimeout(this.timer);
    const session = this.storage.getSession('jwtResponse');
    if (!session) return;
    const expiry = this.storage.getTokenExpiry();
    if (expiry === null) return;
    const remaining = expiry * 1000 - Date.now();
    if (remaining <= 0) this.storage.expireSession(session.token);
    // Cap long waits to avoid the signed 32-bit timeout limit.
    else this.timer = setTimeout(() => this.check(), Math.min(remaining, 2147483647));
  }
}
