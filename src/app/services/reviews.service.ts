import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {WebStorageService} from './web-storage.service';

export interface ProductReview {
  documentId: string;
  message: string;
  authorName: string;
  createdAt: string;
  imageUrl: string | null;
}

export interface ProductReviewsResponse {
  count: number;
  reviews: ProductReview[];
  pagination: { page: number; pageSize: number; pageCount: number };
}

@Injectable({providedIn: 'root'})
export class ReviewsService {
  constructor(private readonly http: HttpClient, private readonly storage: WebStorageService) {}

  list(productId: string, page: number, pageSize = 5): Observable<{data: ProductReviewsResponse}> {
    return this.http.get<{data: ProductReviewsResponse}>(
      `${environment.strapiUrl}/api/catalog/products/${encodeURIComponent(productId)}/reviews`, {params: {page, pageSize}}
    );
  }

  create(productId: string, message: string, image: File | null): Observable<{data: ProductReview}> {
    const data = new FormData();
    data.append('message', message);
    if (image) data.append('image', image);
    const token = this.storage.getSession('jwtResponse')?.token ?? '';
    return this.http.post<{data: ProductReview}>(
      `${environment.strapiUrl}/api/catalog/products/${encodeURIComponent(productId)}/reviews`, data,
      {headers: new HttpHeaders({Authorization: `Bearer ${token}`})}
    );
  }

  imageUrl(url: string | null): string {
    return url ? new URL(url, environment.strapiUrl).href : '';
  }
}
