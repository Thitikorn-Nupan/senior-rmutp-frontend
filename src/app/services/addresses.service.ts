import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {map, Observable, of, shareReplay, switchMap} from 'rxjs';
import {District} from '../entities/addresses/district';
import {Province} from '../entities/addresses/province';
import {environment} from '../../environments/environment';

interface LocationRecord {
  id: number;
  code: string;
  nameEn?: string | null;
  nameTh: string;
}

@Injectable({ providedIn: 'root' })
export class AddressesService {
  private readonly baseUrl = environment.strapiUrl + '/api/locations';
  private provinces$?: Observable<Province[]>;

  constructor(private readonly http: HttpClient) {}

  public getProvinces(refresh = false): Observable<Province[]> {
    if (refresh) this.provinces$ = undefined;
    if (!this.provinces$) {
      this.provinces$ = this.http.get<{data: LocationRecord[]}>(this.baseUrl + '/provinces').pipe(
        map(response => response.data.map(row => new Province(row.id, row.nameEn || row.nameTh))),
        shareReplay({bufferSize: 1, refCount: true})
      );
    }
    return this.provinces$;
  }

  public getDistrictsByProvinceId(pid: number): Observable<District[]> {
    return this.http.get<{data: LocationRecord[]}>(this.baseUrl + '/districts', {
      params: new HttpParams().set('province', pid)
    }).pipe(map(response => response.data.map(row => new District(row.id, row.nameEn || row.nameTh))));
  }

  public getDistrictsByProvinceName(name: string): Observable<District[]> {
    return this.getProvinces().pipe(switchMap(provinces => {
      const province = provinces.find(row => row.name === name);
      return province ? this.getDistrictsByProvinceId(province.pid) : of([]);
    }));
  }
}
