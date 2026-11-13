import {CommonModule} from '@angular/common';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {ReactiveFormsModule} from '@angular/forms';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';
import {CheckoutFormComponent} from './checkout-form.component';
import {CheckoutSelectComponent} from './checkout-select/checkout-select.component';
import {PopUpComponent} from '../pop-up/pop-up.component';
import {AddressesService} from '../../services/addresses.service';
import {CartStatusService} from '../../services/cart-status.service';
import {ProductsService} from '../../services/products.service';
import {WebStorageService} from '../../services/web-storage.service';
import {CheckoutQuote, TransferOrder} from '../../services/checkout.service';
import {environment} from '../../../environments/environment';

describe('PromptPay checkout workflow', () => {
  let fixture: ComponentFixture<CheckoutFormComponent>;
  let http: HttpTestingController;
  let cart: {cartItems: any[]; computeCart: jasmine.Spy};
  const base = environment.strapiUrl + '/api/checkout';
  const quote: CheckoutQuote = {subtotal: '240.50', shippingTotal: '0.00', grandTotal: '240.50', currency: 'THB', totalQuantity: 2,
    items: [{variantDocumentId: 'variantone', name: 'Amber', quantity: 2, unitPrice: '120.25', lineTotal: '240.50'}]};
  const address = {recipientName: 'Test Customer', phone: '0812345678', addressLine1: '1 Test Street', subdistrict: 'Test', district: 'Dusit', province: 'Bangkok', postalCode: '10300', countryCode: 'TH' as const};
  const savedOrder = (): TransferOrder => ({documentId: 'orderone', orderNumber: 'PS-TEST', orderStatus: 'pending_payment', paymentStatus: 'unpaid',
    subtotal: '240.50', shippingTotal: '0.00', grandTotal: '240.50', currency: 'THB', expiresAt: new Date(Date.now() + 1800000).toISOString(),
    customerName: 'Test Customer', customerEmail: 'customer@example.com', customerPhone: address.phone,
    shippingAddress: address, billingAddress: address,
    items: [{name: 'Amber', sku: 'AMBER-1', quantity: 2, unitPrice: '120.25', lineTotal: '240.50'}],
    payment: {reference: 'TRANSFER-TEST', method: 'bank_transfer', status: 'pending', receiptSubmitted: false, submittedAt: null}});

  beforeEach(async () => {
    sessionStorage.removeItem('transfer-checkout-7');
    cart = {cartItems: [{pid: 1, name: 'Amber', price: 120.25, quantity: 2, imageUrl: '', variantDocumentId: 'variantone'}], computeCart: jasmine.createSpy('computeCart')};
    await TestBed.configureTestingModule({
      declarations: [CheckoutFormComponent, PopUpComponent],
      imports: [CommonModule, ReactiveFormsModule, HttpClientTestingModule, RouterTestingModule, CheckoutSelectComponent],
      providers: [
        {provide: CartStatusService, useValue: cart},
        {provide: WebStorageService, useValue: {getUserFormToken: () => ({uid: 7, username: 'customer@example.com'}), getSession: () => ({token: 'customer-token'})}},
        {provide: ProductsService, useValue: {getProductById: () => of({pid: 1, variantDocumentId: 'variantone', price: 120.25})}},
        {provide: AddressesService, useValue: {getProvinces: () => of([{pid: 1, name: 'Bangkok'}]), getDistrictsByProvinceName: () => of([{did: 1, name: 'Dusit'}])}},
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    fixture?.destroy();
    http.verify();
    sessionStorage.removeItem('transfer-checkout-7');
  });
  const start = () => {
    fixture = TestBed.createComponent(CheckoutFormComponent);
    fixture.detectChanges();
  };
  const loadQuote = () => {
    start();
    const request = http.expectOne(base + '/quote');
    expect(request.request.headers.get('Authorization')).toBe('Bearer customer-token');
    expect(request.request.body.items).toEqual([{variantDocumentId: 'variantone', quantity: 2}]);
    request.flush({data: quote});
    fixture.detectChanges();
  };
  const fillDetails = () => {
    for (const [id, value] of Object.entries({'customer-firstname': 'Test', 'customer-lastname': 'Customer', 'customer-phone': '0812345678',
      'shipping-street': '1 Test Street', 'shipping-subdistrict': 'Test', 'shipping-zipcode': '10300',
      'billing-street': '1 Test Street', 'billing-subdistrict': 'Test', 'billing-zipcode': '10300'})) {
      const input = fixture.nativeElement.querySelector('#' + id) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', {bubbles: true}));
    }
    fixture.detectChanges();
  };
  const confirm = () => {
    (fixture.nativeElement.querySelector('.purchase-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    fixture.debugElement.query(By.directive(PopUpComponent)).triggerEventHandler('okEvent', {});
    fixture.detectChanges();
  };
  const create = () => {
    fillDetails();
    confirm();
    const request = http.expectOne(base + '/orders');
    request.flush({data: savedOrder()});
    fixture.detectChanges();
  };
  const selectReceipt = (file = new File(['receipt'], 'receipt.png', {type: 'image/png'})) => {
    const input = fixture.nativeElement.querySelector('#payment-receipt') as HTMLInputElement;
    Object.defineProperty(input, 'files', {value: [file], configurable: true});
    input.dispatchEvent(new Event('change', {bubbles: true}));
    fixture.detectChanges();
  };

  it('shows the server total and withholds the QR until an order is created', () => {
    loadQuote();
    expect(fixture.nativeElement.textContent).toContain('240.50');
    expect(fixture.nativeElement.querySelector('.qr-image')).toBeNull();
  });

  it('maps required customer/address fields and uses an authenticated idempotency key', () => {
    loadQuote(); fillDetails(); confirm();
    const request = http.expectOne(base + '/orders');
    expect(request.request.body.customer).toEqual({firstName: 'Test', lastName: 'Customer', email: 'customer@example.com'});
    expect(request.request.body.shippingAddress).toEqual(address);
    expect(request.request.body.expectedTotal).toBe('240.50');
    expect(request.request.headers.get('Idempotency-Key')).toBeTruthy();
    expect(request.request.headers.get('Authorization')).toBe('Bearer customer-token');
    request.flush({data: savedOrder()}); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.qr-image')).not.toBeNull();
    expect(cart.cartItems.length).toBe(1);
  });

  it('does not create orders with missing phone or address fields', () => {
    loadQuote();
    (fixture.nativeElement.querySelector('.purchase-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectNone(base + '/orders');
    expect(fixture.nativeElement.querySelector('#customer-phone').getAttribute('aria-invalid')).toBe('true');
  });

  it('reuses the same key after a network failure while creating the order', () => {
    loadQuote(); fillDetails(); confirm();
    const first = http.expectOne(base + '/orders');
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('error')); fixture.detectChanges();
    confirm();
    const retry = http.expectOne(base + '/orders');
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush({data: savedOrder()});
  });

  it('uploads a selected receipt and only then clears the matching cart', () => {
    loadQuote(); create(); selectReceipt(); confirm();
    const request = http.expectOne(base + '/orders/orderone/receipt');
    expect(request.request.body instanceof FormData).toBeTrue();
    expect(request.request.body.get('files').name).toBe('receipt.png');
    expect(request.request.headers.has('Content-Type')).toBeFalse();
    expect(cart.cartItems.length).toBe(1);
    const order = savedOrder(); order.paymentStatus = 'pending_review'; order.payment.status = 'awaiting_review'; order.payment.receiptSubmitted = true;
    request.flush({data: order}); fixture.detectChanges();
    expect(cart.cartItems.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('payment is awaiting review');
    expect(fixture.nativeElement.querySelector('#payment-receipt')).toBeNull();
  });

  it('keeps the order and cart available for retry if a receipt upload fails', () => {
    loadQuote(); create(); selectReceipt(); confirm();
    http.expectOne(base + '/orders/orderone/receipt').flush({error: {message: 'Please retry'}}, {status: 500, statusText: 'Error'});
    fixture.detectChanges();
    expect(cart.cartItems.length).toBe(1);
    expect(fixture.nativeElement.querySelector('#payment-receipt')).not.toBeNull();
    expect((fixture.nativeElement.querySelector('.purchase-button') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('recovers an order after page reload without creating another order', () => {
    sessionStorage.setItem('transfer-checkout-7', JSON.stringify({key: 'saved-key-12345678', cartSignature: 'saved'}));
    start();
    http.expectOne(base + '/requests/saved-key-12345678').flush({data: savedOrder()});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('PS-TEST');
    expect(fixture.nativeElement.querySelector('.qr-image')).not.toBeNull();
    http.expectNone(base + '/quote'); http.expectNone(base + '/orders');
  });

  it('preserves a newer cart while recovering a submitted receipt', () => {
    sessionStorage.setItem('transfer-checkout-7', JSON.stringify({key: 'saved-key-12345678', cartSignature: 'different-cart'}));
    start();
    const order = savedOrder(); order.paymentStatus = 'pending_review'; order.payment.receiptSubmitted = true;
    http.expectOne(base + '/requests/saved-key-12345678').flush({data: order}); fixture.detectChanges();
    expect(cart.cartItems.length).toBe(1);
  });

  it('rejects unsupported receipt files before uploading', () => {
    loadQuote(); create();
    selectReceipt(new File(['<svg/>'], 'receipt.svg', {type: 'image/svg+xml'}));
    expect(fixture.nativeElement.textContent).toContain('Choose a JPG, PNG or WebP');
    expect((fixture.nativeElement.querySelector('.purchase-button') as HTMLButtonElement).disabled).toBeTrue();
    http.expectNone(base + '/orders/orderone/receipt');
  });
});
