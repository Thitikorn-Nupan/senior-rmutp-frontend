import {fakeAsync, flushMicrotasks, TestBed, tick} from '@angular/core/testing';
import {Router} from '@angular/router';
import {HTTP_INTERCEPTORS, HttpClient, HttpHeaders} from '@angular/common/http';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {SessionExpiryService} from './session-expiry.service';
import {SessionExpiryInterceptor} from './session-expiry.interceptor';
import {WebStorageService} from './web-storage.service';
import {AlertService} from './alert.service';
import {ProfileService} from './profile.service';
import {environment} from '../../environments/environment';

describe('Session expiration', () => {
  let storage: WebStorageService;
  let alerts: jasmine.SpyObj<AlertService>;
  let router: jasmine.SpyObj<Router>;
  let profiles: jasmine.SpyObj<ProfileService>;
  let http: HttpTestingController;

  function token(seconds: number) {
    return `${btoa('{}')}.${btoa(JSON.stringify({exp: Date.now() / 1000 + seconds}))}.signature`;
  }

  function login(seconds = 10) {
    const accessToken = token(seconds);
    storage.setSession('jwtResponse', {token: accessToken, user: {uid: 1, username: 'member', roles: 'ROLE_USER'}});
    return accessToken;
  }

  beforeEach(() => {
    sessionStorage.removeItem('jwtResponse');
    alerts = jasmine.createSpyObj<AlertService>('AlertService', ['show']);
    profiles = jasmine.createSpyObj<ProfileService>('ProfileService', ['clear']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], providers: [
        {provide: AlertService, useValue: alerts}, {provide: ProfileService, useValue: profiles}, {
          provide: Router,
          useValue: router
        },
        {provide: HTTP_INTERCEPTORS, useClass: SessionExpiryInterceptor, multi: true},
      ]
    });
    storage = TestBed.inject(WebStorageService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    sessionStorage.removeItem('jwtResponse');
  });

  function expectExpired() {
    expect(storage.getSession('jwtResponse')).toBeNull();
    expect(alerts.show).toHaveBeenCalledOnceWith(jasmine.objectContaining({status: 'warning'}));
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {replaceUrl: true});
    expect(profiles.clear).toHaveBeenCalledTimes(1);
  }

  it('expires an idle session at its JWT deadline without reloading', fakeAsync(() => {
    login(1);
    TestBed.inject(SessionExpiryService).start();
    tick(999);
    expect(alerts.show).not.toHaveBeenCalled();
    tick(1);
    expectExpired();
    flushMicrotasks();
  }));
  it('warns once for an expired stored session at startup', fakeAsync(() => {
    login(-1);
    TestBed.inject(SessionExpiryService).start();
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    expectExpired();
    flushMicrotasks();
  }));
  it('catches expiration when a suspended tab becomes visible', fakeAsync(() => {
    login(60);
    TestBed.inject(SessionExpiryService).start();
    const now = Date.now();
    spyOn(Date, 'now').and.returnValue(now + 61000);
    document.dispatchEvent(new Event('visibilitychange'));
    expectExpired();
    flushMicrotasks();
  }));
  it('reschedules when a fresh login replaces the old token', fakeAsync(() => {
    login(1);
    TestBed.inject(SessionExpiryService).start();
    tick(500);
    login(3);
    tick(500);
    expect(alerts.show).not.toHaveBeenCalled();
    tick(2500);
    expectExpired();
    flushMicrotasks();
  }));
  it('cancels expiry alerts when the user logs out manually', fakeAsync(() => {
    login(1);
    TestBed.inject(SessionExpiryService).start();
    storage.clearSession();
    tick(2000);
    expect(alerts.show).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  }));
  it('starts monitoring a login performed after the app has opened', fakeAsync(() => {
    TestBed.inject(SessionExpiryService).start();
    login(1);
    tick(1000);
    expectExpired();
    flushMicrotasks();
  }));
  it('ignores a stale response belonging to a previous token', fakeAsync(() => {
    const old = login(60);
    TestBed.inject(SessionExpiryService).start();
    const fresh = login(120);
    expect(storage.expireSession(old)).toBeFalse();
    expect(storage.getSession('jwtResponse').token).toBe(fresh);
    expect(alerts.show).not.toHaveBeenCalled();
    storage.clearSession();
  }));
  it('handles a malformed token without throwing or looping', fakeAsync(() => {
    storage.setSession('jwtResponse', {token: 'invalid'});
    TestBed.inject(SessionExpiryService).start();
    expectExpired();
    flushMicrotasks();
  }));
  it('handles an authenticated backend 401 after local error handlers, once', fakeAsync(() => {
    const accessToken = login(60);
    TestBed.inject(SessionExpiryService).start();
    const client = TestBed.inject(HttpClient);
    const url = `${environment.strapiUrl}/api/profile/me`;
    for (let i = 0; i < 2; i++) {
      client.get(url, {headers: new HttpHeaders({Authorization: `Bearer ${accessToken}`})}).subscribe({
        error: () => {
        }
      });
    }
    for (const request of http.match(url)) request.flush({}, {status: 401, statusText: 'Unauthorized'});
    flushMicrotasks();
    expectExpired();
  }));
  it('rejects JWT payloads without a valid expiry', fakeAsync(() => {
    TestBed.inject(SessionExpiryService).start();
    for (const payload of [null, {}, {exp: 'invalid'}]) {
      alerts.show.calls.reset();
      router.navigate.calls.reset();
      profiles.clear.calls.reset();
      storage.setSession('jwtResponse', {token: `${btoa('{}')}.${btoa(JSON.stringify(payload))}.signature`});
      expectExpired();
      flushMicrotasks();
    }
  }));
  it('does not expire a session for denied permissions or a failed login', fakeAsync(() => {
    const accessToken = login(60);
    TestBed.inject(SessionExpiryService).start();
    const client = TestBed.inject(HttpClient);
    const url = `${environment.strapiUrl}/api/profile/me`;
    client.get(url, {headers: new HttpHeaders({Authorization: `Bearer ${accessToken}`})}).subscribe({
      error: () => {
      }
    });
    http.expectOne(url).flush({}, {status: 403, statusText: 'Forbidden'});
    const authUrl = `${environment.strapiUrl}/api/auth/local`;
    client.post(authUrl, {}).subscribe({
      error: () => {
      }
    });
    http.expectOne(authUrl).flush({}, {status: 401, statusText: 'Unauthorized'});
    flushMicrotasks();
    expect(alerts.show).not.toHaveBeenCalled();
    storage.clearSession();
  }));
});
