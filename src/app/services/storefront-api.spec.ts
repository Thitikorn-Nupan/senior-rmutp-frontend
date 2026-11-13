import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserRegisterService } from './user-register.service';
import { ProductsService } from './products.service';
import { WebStorageService } from './web-storage.service';
import { environment } from '../../environments/environment';
import { toProduct } from './catalog-api';

describe('Strapi storefront integration', () => {
  let http: HttpTestingController;
  let storage: WebStorageService;
  const url = `${environment.strapiUrl}/api`;
  const token = (exp: number) => `e30.${btoa(JSON.stringify({ id: 7, exp }))}.signature`;

  beforeEach(() => {
    sessionStorage.removeItem('jwtResponse');
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    http = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(WebStorageService);
  });
  afterEach(() => { http.verify(); sessionStorage.removeItem('jwtResponse'); });

  it('sends identifier and maps the returned user for the existing menu', () => {
    TestBed.inject(UserRegisterService).login({ username: ' customer ', password: 'secret' }).subscribe(session => {
      expect(session.token).toBe('jwt');
      expect(session.user).toEqual({ uid: 7, username: 'customer', roles: 'ROLE_USER' });
    });
    const request = http.expectOne(`${url}/auth/local`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ identifier: 'customer', password: 'secret' });
    request.flush({ jwt: 'jwt', user: { id: 7, username: 'customer' } });
  });

  it('reads the stored user when the JWT contains only an id', () => {
    const user = { uid: 7, username: 'customer', roles: 'ROLE_USER' };
    storage.setSession('jwtResponse', { token: token(Date.now() / 1000 + 3600), user });
    expect(storage.getUserFormToken()).toEqual(user);
  });

  it('clears expired, malformed and legacy sessions', () => {
    for (const session of [{ token: token(1), user: {} }, { token: 'broken' }, { token: token(Date.now() / 1000 + 3600) }]) {
      storage.setSession('jwtResponse', session);
      expect(storage.getUserFormToken()).toBeNull();
      expect(storage.getSession('jwtResponse')).toBeNull();
    }
    sessionStorage.setItem('jwtResponse', '{broken');
    expect(storage.getSession('jwtResponse')).toBeNull();
  });

  it('loads all API pages before handing products to the existing paginator', () => {
    const service = TestBed.inject(ProductsService);
    service.getProductsByCategoryByObservable(6).subscribe(products => expect(products.map(p => p.name)).toEqual(['One', 'Two']));
    const page1 = http.expectOne(r => r.url === `${url}/catalog/products` && r.params.get('page') === '1');
    expect(page1.request.params.get('category')).toBe('6');
    page1.flush({ data: [{ id: 1, documentId: 'one', name: 'One' }], meta: { pagination: { page: 1, pageCount: 2 } } });
    http.expectOne(r => r.params.get('page') === '2').flush({ data: [{ id: 2, documentId: 'two', name: 'Two' }], meta: { pagination: { page: 2, pageCount: 2 } } });
  });

  it('passes search text as one query parameter and forwards network failures', () => {
    TestBed.inject(ProductsService).getProductByLikeName('Rose & Tea').subscribe({
      next: () => fail('Expected an error'), error: error => expect(error.status).toBe(503)
    });
    const request = http.expectOne(r => r.params.get('search') === 'Rose & Tea');
    request.flush({}, { status: 503, statusText: 'Unavailable' });
  });

  it('maps variant price, available stock, document ids and media URLs', () => {
    const product = toProduct({ id: 1, documentId: 'product-doc', name: 'Perfume', categories: [{ id: 6 }], variants: [
      { documentId: 'variant-doc', sku: 'SKU', price: '790.00', stockOnHand: 10, stockReserved: 3, image: { url: '/uploads/perfume.jpg' } }
    ] });
    expect(product.price).toBe(790);
    expect(product.unitInStock).toBe(7);
    expect(product.imageUrl).toBe(`${environment.strapiUrl}/uploads/perfume.jpg`);
    expect(product.documentId).toBe('product-doc');
    expect(product.variantDocumentId).toBe('variant-doc');
    expect(product.pcId).toBe(6);
  });

  it('supports products without images or active variants', () => {
    const product = toProduct({ id: 1, documentId: 'doc', name: 'Perfume' });
    expect(product.imageUrl).toBe('assets/images/product-placeholder.svg');
    expect(product.unitInStock).toBe(0);
  });
});
