import {fakeAsync, tick} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {BehaviorSubject, of, Subject} from 'rxjs';
import {ProductsComponent} from './products.component';
import {ProductsService} from '../../services/products.service';
import {CartStatusService} from '../../services/cart-status.service';
import {Product} from '../../entities/items/product';

class ProductsHarness extends ProductsComponent {
  get isLoading() { return this.loading; }
  get displayedProducts() { return this.productsByPageNumber; }
  get error() { return this.errorMessage; }
}

describe('Products category loading', () => {
  let component: ProductsHarness;
  let params: BehaviorSubject<{id: string}>;
  let route: {params: BehaviorSubject<{id: string}>; snapshot: {paramMap: ReturnType<typeof convertToParamMap>}};
  let service: jasmine.SpyObj<ProductsService>;
  const perfume = (name: string) => new Product(1, name, name, '', 100, '', 5);

  beforeEach(() => {
    params = new BehaviorSubject({id: '1'});
    route = {params, snapshot: {paramMap: convertToParamMap({id: '1'})}};
    service = jasmine.createSpyObj('ProductsService', ['getProductsByCategoryByObservable']);
    component = new ProductsHarness(service, route as unknown as ActivatedRoute,
      {} as CartStatusService, {} as Router);
  });

  it('keeps the skeleton visible for one second when the API is fast', fakeAsync(() => {
    service.getProductsByCategoryByObservable.and.returnValue(of([perfume('Rose')]));
    void component.ngOnInit();
    tick(999);
    expect(component.isLoading).toBeTrue();
    tick(1);
    expect(component.isLoading).toBeFalse();
    expect(component.displayedProducts[0].name).toBe('Rose');
    component.ngOnDestroy();
  }));

  it('shows a slow response without adding another second after it arrives', fakeAsync(() => {
    const response = new Subject<Product[]>();
    service.getProductsByCategoryByObservable.and.returnValue(response);
    void component.ngOnInit();
    tick(1600);
    expect(component.isLoading).toBeTrue();
    response.next([perfume('Amber')]);
    response.complete();
    expect(component.isLoading).toBeFalse();
    expect(component.displayedProducts[0].name).toBe('Amber');
    component.ngOnDestroy();
  }));

  it('cancels the old category timer when another category is selected', fakeAsync(() => {
    service.getProductsByCategoryByObservable.and.callFake(id => of([perfume(`Category ${id}`)]));
    void component.ngOnInit();
    tick(600);
    route.snapshot.paramMap = convertToParamMap({id: '2'});
    params.next({id: '2'});
    tick(400);
    expect(component.isLoading).toBeTrue();
    expect(component.displayedProducts).toBeUndefined();
    tick(600);
    expect(component.displayedProducts[0].name).toBe('Category 2');
    component.ngOnDestroy();
  }));

  it('does not let a late API response replace the latest category', fakeAsync(() => {
    const previousResponse = new Subject<Product[]>();
    service.getProductsByCategoryByObservable.and.returnValues(previousResponse, of([perfume('Latest')]));
    void component.ngOnInit();
    route.snapshot.paramMap = convertToParamMap({id: '2'});
    params.next({id: '2'});
    tick(1000);
    previousResponse.next([perfume('Old')]);
    previousResponse.complete();
    expect(component.displayedProducts[0].name).toBe('Latest');
    component.ngOnDestroy();
  }));

  it('leaves the loading state immediately if the API fails', fakeAsync(() => {
    const response = new Subject<Product[]>();
    service.getProductsByCategoryByObservable.and.returnValue(response);
    void component.ngOnInit();
    response.error(new Error('Network failure'));
    expect(component.isLoading).toBeFalse();
    expect(component.error).toContain('Unable to load');
    tick(1000);
    expect(component.displayedProducts).toEqual([]);
    component.ngOnDestroy();
  }));

  it('cancels the pending reveal when the user leaves the page', fakeAsync(() => {
    service.getProductsByCategoryByObservable.and.returnValue(of([perfume('Rose')]));
    void component.ngOnInit();
    tick(500);
    component.ngOnDestroy();
    tick(1000);
    expect(component.displayedProducts).toBeUndefined();
  }));
});
