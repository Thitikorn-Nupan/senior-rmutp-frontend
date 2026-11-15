import {CommonModule} from '@angular/common';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {of} from 'rxjs';
import {ProductsAdminComponent} from './products-admin.component';
import {CheckoutSelectComponent} from '../checkout-form/checkout-select/checkout-select.component';
import {ProductManagementService} from '../../services/product-management.service';
import {AlertService} from '../../services/alert.service';

describe('Product administration dropdown filters', () => {
  let fixture: ComponentFixture<ProductsAdminComponent>;
  let api: jasmine.SpyObj<ProductManagementService>;
  beforeEach(async () => {
    api = jasmine.createSpyObj<ProductManagementService>('ProductManagementService', ['list']);
    api.list.and.returnValue(of({data: [], categories: [{documentId: 'female-category', name: 'Female'}],
      meta: {pagination: {page: 1, pageSize: 12, total: 0, pageCount: 0}}}));
    await TestBed.configureTestingModule({declarations: [ProductsAdminComponent],
      imports: [CommonModule, FormsModule, ReactiveFormsModule, CheckoutSelectComponent], providers: [
        {provide: ProductManagementService, useValue: api},
        {provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['show'])},
        {provide: ActivatedRoute, useValue: {snapshot: {data: {}}}},
      ]}).compileComponents();
    fixture = TestBed.createComponent(ProductsAdminComponent); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges(); api.list.calls.reset();
  });
  afterEach(() => fixture.destroy());
  function open(id: string): HTMLButtonElement {
    const trigger = fixture.nativeElement.querySelector('#' + id) as HTMLButtonElement;
    trigger.click(); fixture.detectChanges(); return trigger;
  }
  async function choose(id: string, index: number) {
    fixture.nativeElement.querySelectorAll('#' + id + '-listbox [role=option]')[index].click();
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
  }
  it('styles category options, applies a selection and supports returning to all categories', async () => {
    const trigger = open('filter-category');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.select-menu .select-option.selected svg')).toBeTruthy();
    await choose('filter-category', 1);
    expect(fixture.componentInstance.category).toBe('female-category');
    expect(api.list).toHaveBeenCalledOnceWith(1, '', 'female-category', '');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    api.list.calls.reset(); open('filter-category'); await choose('filter-category', 0);
    expect(api.list).toHaveBeenCalledOnceWith(1, '', '', '');
    expect(trigger.textContent).toContain(fixture.componentInstance.t.allCategories);
  });
  it('filters by status using keyboard navigation without submitting the search form', async () => {
    const trigger = open('filter-active');
    for (const key of ['ArrowDown', 'Enter']) {
      trigger.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true})); fixture.detectChanges();
    }
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.componentInstance.active).toBe('true');
    expect(api.list).toHaveBeenCalledOnceWith(1, '', '', 'true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
  it('closes on Escape without changing the selected filter', () => {
    const trigger = open('filter-category');
    trigger.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})); fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.category).toBe(''); expect(api.list).not.toHaveBeenCalled();
  });
});
