import {Component, OnDestroy, OnInit} from '@angular/core';
import {catchError, of, Subscription, switchMap, tap} from 'rxjs';
import {Product} from "../../entities/items/product";
import {CartStatusService} from "../../services/cart-status.service";
import {ActivatedRoute} from "@angular/router";
import {ProductsService} from "../../services/products.service";
import {CartItem} from "../../entities/purchase/cart-item";
import {selectProductVariant} from '../../services/catalog-api';
import {AlertService} from '../../services/alert.service';
import {MenuLanguageService} from '../../services/menu-language.service';
import {customerProductMessages} from './customer-product.messages';
import {CartAnimationService} from '../../services/cart-animation.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {ProductReview, ReviewsService} from '../../services/reviews.service';
import {WebStorageService} from '../../services/web-storage.service';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css', './product-variants.css', './product-reviews.css']
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  protected errorMessage = '';
  private request?: Subscription;
  protected product?: Product;
  protected reviews: ProductReview[] = [];
  protected reviewsLoading = false;
  protected reviewsError = '';
  protected reviewPage = 1;
  protected reviewPageCount = 0;
  protected reviewSubmitting = false;
  protected reviewImage: File | null = null;
  protected reviewImagePreview = '';
  protected readonly reviewForm = new FormGroup({
    message: new FormControl('', [Validators.required, Validators.maxLength(2000)]),
  });

  constructor(private readonly cartStatusService: CartStatusService,
              private readonly activatedRoute: ActivatedRoute,
              private readonly productsService: ProductsService,
              public readonly language: MenuLanguageService,
              private readonly alerts: AlertService,
              private readonly cartAnimation: CartAnimationService,
              private readonly reviewsService: ReviewsService,
              private readonly storage: WebStorageService) {
  }

  get t() {
    return customerProductMessages[this.language.language()];
  }

  get canAdd(): boolean {
    if (!this.product?.variantDocumentId || this.product.unitInStock <= 0) return false;
    const inCart = this.cartStatusService.cartItems.find(item => item.variantDocumentId === this.product?.variantDocumentId)?.quantity ?? 0;
    return inCart < this.product.unitInStock;
  }

  get canWriteReview(): boolean {
    const roles = this.storageUser?.roles;
    return roles === 'ROLE_USER' || roles === 'ROLE_ADMIN';
  }

  get reviewText() {
    return this.language.language() === 'th'
      ? {
        title: 'รีวิวจากลูกค้า',
        count: 'รีวิว',
        empty: 'ยังไม่มีรีวิวสำหรับสินค้านี้',
        form: 'รีวิวของคุณ',
        message: 'ความคิดเห็น',
        placeholder: 'บอกเล่าความรู้สึกของคุณ',
        image: 'รูปภาพประกอบ',
        imageHint: 'JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB',
        submit: 'ส่งรีวิว',
        sending: 'กำลังส่งรีวิว…',
        signIn: 'เข้าสู่ระบบเพื่อเขียนรีวิว',
        removeImage: 'ลบรูปภาพ',
        loadFailed: 'ไม่สามารถโหลดรีวิวได้',
        success: 'ส่งรีวิวเรียบร้อยแล้ว',
        previous: 'ก่อนหน้า', next: 'หน้าถัดไป', page: 'หน้า'
      }
      : {
        title: 'Customer reviews',
        count: 'reviews',
        empty: 'There are no reviews for this fragrance yet.',
        form: 'Your review',
        message: 'Comment',
        placeholder: 'Share your experience with this fragrance',
        image: 'Add an image',
        imageHint: 'JPG, PNG or WebP · Up to 5 MB',
        submit: 'Post review',
        sending: 'Posting review…',
        signIn: 'Sign in to write a review',
        removeImage: 'Remove image',
        loadFailed: 'Unable to load reviews.',
        success: 'Your review has been posted.',
        previous: 'Previous', next: 'Next', page: 'Page'
      };
  }

  private get storageUser() {
    return this.storage.getUserFormToken();
  }

  protected chooseVariant(id: string): void {
    if (this.product) this.product = selectProductVariant(this.product, id);
  }

  async ngOnInit(): Promise<void> {
    // await this.delay(1000)
    // this.loadProduct()
    this.loadProduct();
  }

  private loadProduct() {
    // *** check param in this case param is id
    this.request = this.activatedRoute.paramMap.pipe(
      tap(() => {
        this.product = undefined;
        this.errorMessage = '';
      }),
      switchMap(params => this.productsService.getProductById(params.get('id') ?? '').pipe(
        catchError(error => {
          this.errorMessage = error.status === 404 ? this.t.notFound : this.t.retry;
          return of(null);
        })
      ))
    ).subscribe({
      next: product => {
        this.product = product ?? undefined;
        if (this.product?.documentId) this.loadReviews(this.product.documentId, 1);
      },
    });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.releaseReviewImagePreview();
  }

  protected addItem(product: Product, event: MouseEvent) {
    if (!this.canAdd) {
      this.alerts.show({header: this.t.limit, detail: this.t.limitDetail, status: 'warning'});
      return;
    }
    const cartItem: CartItem = new CartItem(product)
    const added = this.cartStatusService.addItemToCart(cartItem);
    if (added) this.cartAnimation.flyToCart(event.currentTarget as HTMLElement, product.imageUrl);
    this.alerts.show(added
      ? {header: this.t.added, detail: `${product.name} · ${product.variantLabel || product.sku}`, status: 'success'}
      : {header: this.t.limit, detail: this.t.limitDetail, status: 'warning'});
  }

  protected selectReviewImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      input.value = '';
      this.alerts.show({header: this.reviewText.image, detail: this.reviewText.imageHint, status: 'warning'});
      return;
    }
    this.releaseReviewImagePreview();
    this.reviewImage = file;
    this.reviewImagePreview = URL.createObjectURL(file);
  }

  protected removeReviewImage(): void {
    this.releaseReviewImagePreview();
  }

  protected submitReview(): void {
    if (!this.product?.documentId || !this.canWriteReview || this.reviewSubmitting) return;
    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }
    this.reviewSubmitting = true;
    this.reviewsService.create(this.product.documentId, this.reviewForm.controls.message.value?.trim() ?? '', this.reviewImage).subscribe({
      next: ({data}) => {
        this.product!.reviewCount++;
        this.reviewForm.reset();
        this.removeReviewImage();
        this.reviewSubmitting = false;
        this.loadReviews(this.product!.documentId!, 1);
        this.alerts.show({header: this.reviewText.success, detail: '', status: 'success'});
      },
      error: (error) => {
        this.reviewSubmitting = false;
        this.alerts.show({
          header: this.reviewText.form,
          detail: error?.error?.error?.message ?? this.reviewText.loadFailed,
          status: 'error'
        });
      }
    });
  }

  protected reviewImageUrl(review: ProductReview): string {
    return this.reviewsService.imageUrl(review.imageUrl);
  }

  protected changeReviewPage(page: number): void {
    if (!this.product?.documentId || page < 1 || page > this.reviewPageCount || page === this.reviewPage) return;
    this.loadReviews(this.product.documentId, page);
  }

  protected reviewPages(): number[] {
    return Array.from({length: this.reviewPageCount}, (_, index) => index + 1);
  }

  private loadReviews(productId: string, page: number): void {
    this.reviewsLoading = true;
    this.reviewsError = '';
    this.reviews = [];
    this.reviewsService.list(productId, page).subscribe({
      next: ({data}) => {
        this.reviews = data.reviews;
        if (this.product) this.product.reviewCount = data.count;
        this.reviewPage = data.pagination.page;
        this.reviewPageCount = data.pagination.pageCount;
        this.reviewsLoading = false;
      },
      error: () => {
        this.reviewsError = this.reviewText.loadFailed;
        this.reviewsLoading = false;
      }
    });
  }

  private releaseReviewImagePreview(): void {
    if (this.reviewImagePreview) URL.revokeObjectURL(this.reviewImagePreview);
    this.reviewImagePreview = '';
    this.reviewImage = null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

}
