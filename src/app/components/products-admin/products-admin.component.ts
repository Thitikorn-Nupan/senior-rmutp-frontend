import {
  AfterViewChecked,
  Component,
  computed,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';
import {FormArray, FormControl, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {firstValueFrom, Subscription} from 'rxjs';
import {AlertService} from '../../services/alert.service';
import {MenuLanguageService} from '../../services/menu-language.service';
import {
  ManagedCategory,
  ManagedProduct,
  ManagedVariant,
  ProductManagementInput,
  ProductManagementService
} from '../../services/product-management.service';
import {productAdminMessages} from './products-admin.messages';

@Component({
  selector: 'app-products-admin',
  templateUrl: './products-admin.component.html',
  styleUrls: ['./products-admin-cards.css', './products-admin-dialog.css', './products-admin.component.css', './products-admin-editor.css', './products-admin-controls.css'],
})
export class ProductsAdminComponent implements OnInit, OnDestroy, AfterViewChecked {
  products: ManagedProduct[] = [];
  readonly categories = signal<ManagedCategory[]>([]);
  loading = false;
  loadFailed = false;
  saving = false;
  search = '';
  category = '';
  active = '';
  page = 1;
  total = 0;
  pageCount = 0;
  editorOpen = false;
  editing?: ManagedProduct;
  deleting?: ManagedProduct;
  preview = '';
  file?: File;
  imageFileName = '';
  images: number[] = [];
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255), Validators.pattern(/\S/)]
    }),
    description: new FormControl('', {nonNullable: true, validators: [Validators.maxLength(20000)]}),
    categoryDocumentId: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    isActive: new FormControl(true, {nonNullable: true}),
    variants: new FormArray<FormGroup>([]),
  });
  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;
  private listRequest?: Subscription;
  private objectUrl?: string;
  private previousFocus?: HTMLElement;
  private needsFocus = false;
  private originalOverflow?: string;
  private destroyed = false;

  constructor(public readonly api: ProductManagementService,
              public readonly language: MenuLanguageService,
              private readonly alerts: AlertService,
              private readonly route: ActivatedRoute) {
  }

  get t() {
    return productAdminMessages[this.language.language()];
  }

  get variants() {
    return this.form.controls.variants;
  }

  readonly editorCategoryOptions = computed(() => this.categories().map(item => ({name: item.name, value: item.documentId})));

  readonly categoryOptions = computed(() => [
    {name: this.t.allCategories, value: ''},
    ...this.categories().map(item => ({name: item.name, value: item.documentId})),
  ]);

  readonly statusOptions = computed(() => [
    {name: this.t.allStatuses, value: ''},
    {name: this.t.active, value: 'true'},
    {name: this.t.inactive, value: 'false'},
  ]);

  get activeCount() {
    return this.products.filter(p => p.isActive).length;
  }

  get lowCount() {
    return this.products.filter(p => p.isActive && this.stock(p) < 5).length;
  }

  ngOnInit(): void {
    this.load();
    if (this.route.snapshot.data['create']) this.openEditor();
  }

  load(): void {
    this.listRequest?.unsubscribe();
    this.loading = true;
    this.loadFailed = false;
    this.listRequest = this.api.list(this.page, this.search, this.category, this.active).subscribe({
      next: response => {
        this.products = response.data;
        this.categories.set(response.categories);
        this.total = response.meta.pagination.total;
        this.pageCount = response.meta.pagination.pageCount;
        this.loading = false;
        if (this.page > Math.max(1, this.pageCount)) {
          this.page = Math.max(1, this.pageCount);
          this.load();
        }
      },
      error: error => {
        this.loading = false;
        this.loadFailed = true;
        this.notifyError(this.t.loadFailed, error);
      },
    });
  }

  filter(): void {
    this.page = 1;
    this.load();
  }

  resetFilters(): void {
    this.search = '';
    this.category = '';
    this.active = '';
    this.filter();
  }

  changePage(page: number): void {
    if (page > 0 && page <= this.pageCount) {
      this.page = page;
      this.load();
    }
  }

  stock(product: ManagedProduct): number {
    return product.variants.filter(v => v.isActive).reduce((sum, v) => sum + Math.max(0, v.stockOnHand - v.stockReserved), 0);
  }

  price(product: ManagedProduct): number {
    return Math.min(...product.variants.filter(v => v.isActive).map(v => Number(v.price)), ...(!product.variants.some(v => v.isActive) ? [0] : []));
  }

  trackProduct(_: number, product: ManagedProduct): string {
    return product.documentId;
  }

  openEditor(product?: ManagedProduct): void {
    if (this.saving) return;
    this.editing = product;
    this.form.reset({
      name: product?.name ?? '', description: product?.description ?? '', categoryDocumentId: product?.categories.at(0)?.documentId ?? this.categories().at(0)?.documentId ?? '',
      isActive: product?.isActive ?? true,
    });
    this.variants.clear();
    for (const variant of product?.variants.length ? product.variants : [undefined]) this.addVariant(variant);
    this.images = product?.images.map(image => image.id) ?? [];
    this.releasePreview();
    this.file = undefined;
    this.imageFileName = '';
    this.preview = this.api.imageUrl(product?.images[0]);
    this.editorOpen = true;
    this.openDialog();
  }

  addVariant(variant?: ManagedVariant): void {
    this.variants.push(new FormGroup({
      documentId: new FormControl(variant?.documentId),
      sku: new FormControl(variant?.sku ?? '', [Validators.required, Validators.maxLength(90), Validators.pattern(/\S/)]),
      label: new FormControl(variant?.label ?? '', [Validators.maxLength(180)]),
      price: new FormControl(variant?.price ?? 0, [Validators.required, Validators.min(0), Validators.max(999999999), Validators.pattern(/^\d+(\.\d{1,2})?$/)]),
      stockOnHand: new FormControl(variant?.stockOnHand ?? 0, [Validators.required, Validators.min(variant?.stockReserved ?? 0), Validators.max(2147483647), Validators.pattern(/^\d+$/)]),
      stockReserved: new FormControl(variant?.stockReserved ?? 0),
      expectedStockOnHand: new FormControl(variant?.stockOnHand),
      isActive: new FormControl(variant?.isActive ?? true),
    }));
  }

  removeVariant(index: number): void {
    if (!this.saving && this.variants.length > 1 && !this.variants.at(index).value.documentId) this.variants.removeAt(index);
  }

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      input.value = '';
      this.alerts.show({header: this.t.invalid, detail: this.t.fileInvalid, status: 'warning'});
      return;
    }
    this.releasePreview();
    this.file = file;
    this.imageFileName = file.name;
    this.objectUrl = URL.createObjectURL(file);
    this.preview = this.objectUrl;
  }

  async save(): Promise<void> {
    if (this.saving) return;
    this.form.markAllAsTouched();
    const skus = this.variants.controls.map(v => String(v.value.sku).trim().toLowerCase());
    if (this.form.invalid || new Set(skus).size !== skus.length || !this.variants.length) {
      this.alerts.show({header: this.t.invalid, detail: this.t.invalidDetail, status: 'warning'});
      return;
    }
    this.saving = true;
    const isEdit = Boolean(this.editing);
    try {
      if (this.file) {
        const uploaded = await firstValueFrom(this.api.upload(this.file));
        if (!uploaded[0]?.id) throw new Error(this.t.error);
        this.images = [uploaded[0].id, ...this.images.slice(1)];
        // Keep the uploaded media for a retry if saving the product fails.
        this.file = undefined;
      }
      const value = this.form.getRawValue();
      const data: ProductManagementInput = {
        ...value, expectedUpdatedAt: this.editing?.updatedAt, images: this.images, variants: value.variants.map(v => ({
          ...(v['documentId'] ? {documentId: v['documentId']} : {}),
          sku: v['sku'].trim(),
          label: v['label']?.trim() ?? '',
          price: v['price'],
          stockOnHand: Number(v['stockOnHand']),
          isActive: v['isActive'],
          ...(v['documentId'] ? {expectedStockOnHand: v['expectedStockOnHand']} : {}),
        }))
      };
      await firstValueFrom(this.api.save(this.editing?.documentId, data));
      if (this.destroyed) return;
      this.saving = false;
      this.closeDialog();
      this.alerts.show({header: isEdit ? this.t.saved : this.t.created, detail: value.name, status: 'success'});
      this.load();
    } catch (error) {
      if (!this.destroyed) this.notifyError(this.t.saveFailed, error);
    } finally {
      this.saving = false;
    }
  }

  confirmDelete(product: ManagedProduct): void {
    if (this.saving) return;
    this.deleting = product;
    this.openDialog();
  }

  async deleteProduct(): Promise<void> {
    if (!this.deleting || this.saving) return;
    this.saving = true;
    const product = this.deleting;
    try {
      await firstValueFrom(this.api.delete(product.documentId));
      if (this.destroyed) return;
      this.saving = false;
      this.closeDialog();
      this.alerts.show({header: this.t.removed, detail: product.name, status: 'success'});
      this.load();
    } catch (error) {
      if (!this.destroyed) this.notifyError(this.t.deleteFailed, error);
    } finally {
      this.saving = false;
    }
  }

  private notifyError(header: string, error: any): void {
    const message = error?.error?.error?.message ?? error?.error?.message;
    const detail = error?.status === 0 ? this.t.network : error?.status === 401 ? this.t.expired
      : error?.status === 403 ? this.t.forbidden : typeof message === 'string' ? message : this.t.error;
    this.alerts.show({header, detail, status: 'error'});
  }

  private openDialog(): void {
    this.previousFocus = document.activeElement as HTMLElement;
    this.originalOverflow ??= document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.needsFocus = true;
  }

  closeDialog(): void {
    if (this.saving) return;
    this.editorOpen = false;
    this.deleting = undefined;
    this.file = undefined;
    this.releasePreview();
    this.restoreScroll();
    this.previousFocus?.focus();
  }

  ngAfterViewChecked(): void {
    if (this.needsFocus && this.dialog) {
      this.dialog.nativeElement.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
      this.needsFocus = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKey(event: KeyboardEvent): void {
    if (!this.editorOpen && !this.deleting) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDialog();
    }
    if (event.key !== 'Tab' || !this.dialog) return;
    const controls = Array.from(this.dialog.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'));
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  private releasePreview(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
  }

  private restoreScroll(): void {
    if (this.originalOverflow !== undefined) document.body.style.overflow = this.originalOverflow;
    this.originalOverflow = undefined;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.listRequest?.unsubscribe();
    this.releasePreview();
    this.restoreScroll();
  }
}
