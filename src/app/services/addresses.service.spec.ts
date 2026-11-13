import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {AddressesService} from './addresses.service';
import {environment} from '../../environments/environment';

describe('Checkout Strapi locations', () => {
  let service: AddressesService;
  let http: HttpTestingController;
  const base = environment.strapiUrl + '/api/locations';
  const provinces = {data: [
    {id: 7, code: '1', nameEn: 'Bangkok', nameTh: 'Bangkok'},
    {id: 9, code: '2', nameEn: 'Nonthaburi', nameTh: 'Nonthaburi'}
  ]};
  beforeEach(() => {
    TestBed.configureTestingModule({imports: [HttpClientTestingModule]});
    service = TestBed.inject(AddressesService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('maps Strapi provinces and caches the options for both address sections', () => {
    service.getProvinces().subscribe(rows => expect(rows.map(p => p.name)).toEqual(['Bangkok', 'Nonthaburi']));
    http.expectOne(base + '/provinces').flush(provinces);
    service.getProvinces().subscribe(rows => expect(rows[0].pid).toBe(7));
    http.expectNone(base + '/provinces');
  });

  it('filters districts by the Strapi province ID instead of the supplied seed code', () => {
    service.getDistrictsByProvinceName('Nonthaburi').subscribe(rows => {
      expect(rows[0].did).toBe(12);
      expect(rows[0].name).toBe('Bang Kruai');
    });
    http.expectOne(base + '/provinces').flush(provinces);
    const request = http.expectOne(r => r.url === base + '/districts' && r.params.get('province') === '9');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({data: [{id: 12, code: '11', nameEn: 'Bang Kruai', nameTh: 'Bang Kruai'}]});
  });

  it('returns empty options for an unknown province without requesting every district', () => {
    service.getDistrictsByProvinceName('Unknown').subscribe(rows => expect(rows).toEqual([]));
    http.expectOne(base + '/provinces').flush(provinces);
    http.expectNone(r => r.url === base + '/districts');
  });

  it('falls back to the Thai name when an English name is missing', () => {
    service.getDistrictsByProvinceId(7).subscribe(rows => expect(rows[0].name).toBe('ดุสิต'));
    http.expectOne(base + '/districts?province=7').flush({data: [{id: 1, code: '1', nameTh: 'ดุสิต'}]});
  });

  it('allows retry after a province request fails', () => {
    service.getProvinces().subscribe({error: () => {}});
    http.expectOne(base + '/provinces').flush({}, {status: 503, statusText: 'Unavailable'});
    service.getProvinces().subscribe(rows => expect(rows.length).toBe(2));
    http.expectOne(base + '/provinces').flush(provinces);
  });

  it('refreshes a previously empty province list when retry is requested', () => {
    service.getProvinces().subscribe();
    http.expectOne(base + '/provinces').flush({data: []});
    service.getProvinces(true).subscribe(rows => expect(rows.length).toBe(2));
    http.expectOne(base + '/provinces').flush(provinces);
  });
});
