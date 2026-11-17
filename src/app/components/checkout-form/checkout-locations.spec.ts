import {CommonModule} from '@angular/common';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';
import {CheckoutFormComponent} from './checkout-form.component';
import {CheckoutSelectComponent} from './checkout-select/checkout-select.component';
import {PopUpComponent} from '../pop-up/pop-up.component';
import {CartStatusService} from '../../services/cart-status.service';
import {ProductsService} from '../../services/products.service';
import {WebStorageService} from '../../services/web-storage.service';
import {CheckoutService} from '../../services/checkout.service';
import {ProfileService} from '../../services/profile.service';
import {environment} from '../../../environments/environment';
import {checkoutLocationFixture as locations} from './checkout-locations.fixture';

describe('Checkout province/district display with the imported Thai dataset', () => {
  let fixture: ComponentFixture<CheckoutFormComponent>;
  let http: HttpTestingController;
  const base = `${environment.strapiUrl}/api/locations`;
  const open = (id: string) => {
    const trigger = fixture.nativeElement.querySelector('#' + id) as HTMLButtonElement;
    trigger.click(); fixture.detectChanges(); return trigger;
  };
  function loadDistricts(province: typeof locations[number]) {
    for (const request of http.match(`${base}/districts?province=${province.id}`)) request.flush({data: province.districts});
    fixture.detectChanges();
  }
  function choose(id: string, label: string) {
    open(id);
    const option = Array.from(fixture.nativeElement.querySelectorAll(`#${id}-listbox [role=option]`) as NodeListOf<HTMLElement>)
      .find(row => row.textContent?.trim() === label);
    expect(option).withContext(`Missing ${label} in ${id}`).toBeDefined(); option!.click(); fixture.detectChanges();
  }
  beforeEach(async () => {
    sessionStorage.removeItem('transfer-checkout-7777');
    await TestBed.configureTestingModule({declarations: [CheckoutFormComponent, PopUpComponent],
      imports: [CommonModule, ReactiveFormsModule, HttpClientTestingModule, RouterTestingModule, CheckoutSelectComponent],
      providers: [
        {provide: CartStatusService, useValue: {cartItems: [{pid: 1, name: 'Test', variantDocumentId: 'test', quantity: 1, price: 100}], computeCart: () => {}}},
        {provide: ProductsService, useValue: {}},
        {provide: ProfileService, useValue: {profile: () => null, get: () => of({data: {firstName: '', lastName: '', displayName: '', phone: '', email: '', username: '', shippingAddress: null}})}},
        {provide: WebStorageService, useValue: {getUserFormToken: () => ({uid: 7777, username: 'test@example.invalid'})}},
        {provide: CheckoutService, useValue: {quote: () => of({data: {subtotal: '100', shippingTotal: '0', grandTotal: '100', totalQuantity: 1, currency: 'THB', items: []}})}},
      ]}).compileComponents();
    http = TestBed.inject(HttpTestingController); fixture = TestBed.createComponent(CheckoutFormComponent); fixture.detectChanges();
    http.expectOne(`${base}/provinces`).flush({data: locations.map(({districts, ...province}) => province)});
    loadDistricts(locations[0]);
  });
  afterEach(() => { http.verify(); fixture.destroy(); sessionStorage.removeItem('transfer-checkout-7777'); });
  it('renders all 20 provinces and keeps a long dropdown scrollable', () => {
    open('shipping-province');
    expect(fixture.nativeElement.querySelectorAll('#shipping-province-listbox [role=option]').length).toBe(20);
    const listbox = fixture.nativeElement.querySelector('#shipping-province-listbox') as HTMLElement;
    expect(getComputedStyle(listbox).overflowY).toBe('auto');
    expect(listbox.scrollHeight).toBeGreaterThan(listbox.clientHeight);
  });
  it('loads and renders every imported district under the matching province', () => {
    for (const province of locations) {
      choose('shipping-province', province.nameEn);
      if (province !== locations[0]) loadDistricts(province);
      open('shipping-district');
      const rendered = Array.from(fixture.nativeElement.querySelectorAll('#shipping-district-listbox [role=option]') as NodeListOf<HTMLElement>)
        .map(row => row.textContent!.trim());
      expect(rendered.length).toBeGreaterThanOrEqual(10);
      expect(rendered.sort()).toEqual(province.districts.map(d =>
        province.districts.filter(other => other.nameEn === d.nameEn).length > 1 ? `${d.nameEn} (${d.nameTh})` : d.nameEn).sort());
      fixture.nativeElement.querySelector('#shipping-district').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
      fixture.detectChanges();
    }
  });
  it('clears the previous district while loading a new province and keeps billing independent', () => {
    const chiangMai = locations.find(p => p.nameEn === 'Chiang Mai')!;
    choose('shipping-province', chiangMai.nameEn);
    expect((fixture.nativeElement.querySelector('#shipping-district') as HTMLButtonElement).disabled).toBeTrue();
    loadDistricts(chiangMai);
    expect(fixture.nativeElement.querySelector('#shipping-district').textContent).toContain(chiangMai.districts[0].nameEn);
    expect(fixture.nativeElement.querySelector('#billing-province').textContent).toContain('Bangkok');
    expect(fixture.nativeElement.querySelector('#billing-district').textContent).toContain('Phra Nakhon');
  });
  it('copies the current province and district choices to the billing address', () => {
    const songkhla = locations.find(p => p.nameEn === 'Songkhla')!;
    choose('shipping-province', songkhla.nameEn); loadDistricts(songkhla);
    choose('shipping-district', songkhla.districts[1].nameEn);
    const copy = fixture.nativeElement.querySelector('.copy-address input') as HTMLInputElement;
    copy.checked = true; copy.dispatchEvent(new Event('change', {bubbles: true})); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#billing-province').textContent).toContain(songkhla.nameEn);
    expect(fixture.nativeElement.querySelector('#billing-district').textContent).toContain(songkhla.districts[1].nameEn);
    open('billing-district');
    expect(fixture.nativeElement.querySelectorAll('#billing-district-listbox [role=option]').length).toBe(songkhla.districts.length);
  });
  it('distinguishes districts with identical English names and saves the correct Thai value', () => {
    const ayutthaya = locations.find(p => p.code === '14')!;
    choose('shipping-province', ayutthaya.nameEn); loadDistricts(ayutthaya);
    choose('shipping-district', 'Bang Sai (บางซ้าย)');
    const form = fixture.componentInstance as unknown as {form: {get(path: string): {value: string}}};
    expect(form.form.get('shippingAddress.district').value).toBe('บางซ้าย');
    expect(fixture.nativeElement.querySelector('#shipping-district').textContent).toContain('Bang Sai (บางซ้าย)');
  });
});
