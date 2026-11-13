import {CommonModule} from '@angular/common';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {OrdersHistoryComponent} from './orders-history.component';
import {WebStorageService} from '../../services/web-storage.service';
import {environment} from '../../../environments/environment';

describe('Customer order history', () => {
  let fixture: ComponentFixture<OrdersHistoryComponent>;
  let http: HttpTestingController;
  const base = environment.strapiUrl + '/api/checkout/orders';
  const summary = {documentId: 'order-one', orderNumber: 'PS-TEST', orderStatus: 'pending_payment', paymentStatus: 'unpaid',
    grandTotal: '240.50', currency: 'THB', placedAt: '2026-11-13T08:00:00Z', totalQuantity: 2, items: [{name: 'Amber'}]};
  const address = {recipientName: 'Customer', phone: '0812345678', addressLine1: '1 Test Street', subdistrict: 'Test', district: 'Dusit', province: 'Bangkok', postalCode: '10300', countryCode: 'TH'};
  const detail = {...summary, subtotal: '240.50', shippingTotal: '0.00', expiresAt: new Date(Date.now() + 1800000).toISOString(),
    shippingAddress: address, billingAddress: address, customerName: 'Customer', customerEmail: 'test@example.invalid', customerPhone: address.phone,
    items: [{name: 'Amber', sku: 'AMBER-1', quantity: 2, unitPrice: '120.25', lineTotal: '240.50'}],
    payment: {reference: 'TRANSFER-TEST', method: 'bank_transfer', status: 'pending', receiptSubmitted: false, submittedAt: null}};
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OrdersHistoryComponent],
      imports: [CommonModule, FormsModule, HttpClientTestingModule, RouterTestingModule],
      providers: [{provide: WebStorageService, useValue: {getSession: () => ({token: 'current-token'})}}]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OrdersHistoryComponent);
    fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); http.verify(); });
  const list = (data: any[] = [summary], pageCount = 1) => {
    const request = http.expectOne(r => r.url === base);
    expect(request.request.headers.get('Authorization')).toBe('Bearer current-token');
    expect(request.request.params.has('email')).toBeFalse();
    request.flush({data, meta: {pagination: {page: 1, pageSize: 10, total: data.length, pageCount}}});
    fixture.detectChanges();
  };
  const open = () => {
    list();
    fixture.nativeElement.querySelector('.order-actions button').click();
    http.expectOne(base + '/order-one').flush({data: detail});
    fixture.detectChanges();
  };
  it('shows loading then an empty state without an endless spinner', () => {
    expect(fixture.nativeElement.textContent).toContain('กำลังโหลดประวัติ');
    list([]);
    expect(fixture.nativeElement.textContent).toContain('ยังไม่มีคำสั่งซื้อ');
    expect(fixture.nativeElement.querySelector('.spinner-border')).toBeNull();
  });
  it('renders order details and submits a receipt using the existing checkout endpoint', () => {
    open();
    expect(fixture.nativeElement.textContent).toContain('1 Test Street');
    const file = new File(['image'], 'slip.png', {type: 'image/png'});
    const input = fixture.nativeElement.querySelector('input[type=file]');
    Object.defineProperty(input, 'files', {value: [file]});
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.receipt-form').dispatchEvent(new Event('submit'));
    const request = http.expectOne(base + '/order-one/receipt');
    const uploaded = request.request.body.get('files') as File;
    expect(uploaded.name).toBe('slip.png');
    expect(uploaded.size).toBe(file.size);
    expect(uploaded.type).toBe(file.type);
    request.flush({data: {...detail, paymentStatus: 'pending_review', payment: {...detail.payment, receiptSubmitted: true}}});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.receipt-form')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('รอตรวจสอบสลิป');
    expect(fixture.nativeElement.textContent).toContain('ส่งหลักฐานแล้ว');
  });
  it('hides receipt submission for expired orders', () => {
    list();
    fixture.nativeElement.querySelector('.order-actions button').click();
    http.expectOne(base + '/order-one').flush({data: {...detail, orderStatus: 'expired'}});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.receipt-form')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('หมดเวลาชำระเงิน');
  });
  it('passes search as a single encoded parameter and resets pagination', () => {
    list();
    const input = fixture.nativeElement.querySelector('#order-search');
    input.value = 'PS-A & B'; input.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('.filters').dispatchEvent(new Event('submit'));
    const request = http.expectOne(r => r.url === base && r.params.get('search') === 'PS-A & B');
    expect(request.request.params.get('page')).toBe('1');
    request.flush({data: [], meta: {pagination: {page: 1, pageCount: 0, total: 0}}});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ไม่พบคำสั่งซื้อที่ตรงกับตัวกรอง');
  });
  it('recovers from network failure through retry', () => {
    http.expectOne(r => r.url === base).flush({}, {status: 503, statusText: 'Unavailable'});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.spinner-border')).toBeNull();
    fixture.nativeElement.querySelector('[role=alert] button').click();
    list();
    expect(fixture.nativeElement.textContent).toContain('PS-TEST');
  });
});
