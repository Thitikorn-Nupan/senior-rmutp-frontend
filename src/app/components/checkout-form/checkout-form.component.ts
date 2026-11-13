import {Component, OnDestroy, OnInit} from '@angular/core';
import {forkJoin, map, of, Subscription, switchMap, finalize} from 'rxjs';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AddressesService} from '../../services/addresses.service';
import {CartStatusService} from '../../services/cart-status.service';
import {ProductsService} from '../../services/products.service';
import {WebStorageService} from '../../services/web-storage.service';
import {CheckoutAddress, CheckoutQuote, CheckoutService, TransferCheckout, TransferItem, TransferOrder} from '../../services/checkout.service';
import {Province} from '../../entities/addresses/province';
import {District} from '../../entities/addresses/district';

interface PendingCheckout { key: string; orderId?: string; cartSignature: string; cartCleared?: boolean; }

@Component({
  selector: 'app-checkout-form',
  templateUrl: './checkout-form.component.html',
  styleUrls: ['./checkout-form.component.css', './checkout-payment.css', './checkout-summary.css', './checkout-transfer.css']
})
export class CheckoutFormComponent implements OnInit, OnDestroy {
  protected form!: FormGroup;
  protected provinces: Province[] = [];
  protected shippingAddressDistrict: District[] = [];
  protected billingAddressDistrict: District[] = [];
  protected addressLoading = {provinces: false, shippingAddress: false, billingAddress: false};
  protected addressErrors = {provinces: '', shippingAddress: '', billingAddress: ''};
  protected isCopy = false;
  protected busy = false;
  protected quoteLoading = false;
  protected restoring = false;
  protected errorMessage = '';
  protected fileError = '';
  protected receipt?: File;
  protected receiptPreview = '';
  protected quote?: CheckoutQuote;
  protected order?: TransferOrder;
  protected totalPrice = 0;
  protected totalQuantity = 0;
  protected now = Date.now();
  protected visible = false;
  protected iconMode: 'WARN' | 'ERROR' | 'CONFIRM' | 'SUCCESS' = 'CONFIRM';
  protected headerTitle = '';
  protected body = '';
  private pending?: PendingCheckout;
  private storageKey = '';
  private provinceRequest?: Subscription;
  private districtRequests: Partial<Record<'shippingAddress' | 'billingAddress', Subscription>> = {};
  private readonly cartSubscriptions = new Subscription();
  private clock?: ReturnType<typeof setInterval>;

  constructor(private readonly addressesService: AddressesService,
    protected readonly cartStatusService: CartStatusService,
    private readonly checkoutService: CheckoutService,
    private readonly formBuilder: FormBuilder,
    private readonly storage: WebStorageService,
    private readonly productsService: ProductsService) {}

  ngOnInit(): void {
    const user = this.storage.getUserFormToken();
    this.storageKey = 'transfer-checkout-' + user?.uid;
    const phone = [Validators.required, Validators.pattern(/^[+\d][\d\s()-]{6,29}$/)];
    const address = () => this.formBuilder.group({
      street: ['', [Validators.required, Validators.maxLength(255)]],
      subdistrict: ['', [Validators.required, Validators.maxLength(100)]],
      province: [null, Validators.required], district: [null, Validators.required],
      zipcode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]]
    });
    this.form = this.formBuilder.group({
      customer: this.formBuilder.group({
        firstname: ['', [Validators.required, Validators.maxLength(90)]],
        lastname: ['', [Validators.required, Validators.maxLength(89)]],
        email: [user?.username?.includes('@') ? user.username : '', [Validators.required, Validators.email]],
        phone: ['', phone]
      }), shippingAddress: address(), billingAddress: address()
    });
    this.initialAndSetDefaultAddresses();
    this.clock = setInterval(() => { this.now = Date.now(); }, 1000);
    try { this.pending = JSON.parse(sessionStorage.getItem(this.storageKey) || 'null') || undefined; }
    catch { sessionStorage.removeItem(this.storageKey); }
    if (this.pending?.cartCleared && this.cartStatusService.cartItems.length) {
      this.pending = undefined;
      sessionStorage.removeItem(this.storageKey);
    }
    if (this.pending?.key) this.refreshOrder();
    else this.refreshQuote();
  }

  protected get receiptSubmitted(): boolean {
    return this.order?.paymentStatus === 'pending_review' || Boolean(this.order?.payment.receiptSubmitted);
  }
  protected get expired(): boolean {
    return !!this.order && (this.order.orderStatus === 'expired' ||
      (!this.receiptSubmitted && Date.parse(this.order.expiresAt) <= this.now));
  }
  protected get shippingTotal(): number { return Number(this.order?.shippingTotal ?? this.quote?.shippingTotal ?? 0); }
  protected get canRecoverOrder(): boolean { return Boolean(this.pending?.key); }
  protected get subtotal(): number { return Number(this.order?.subtotal ?? this.quote?.subtotal ?? 0); }
  private cartSignature(): string {
    return JSON.stringify(this.cartStatusService.cartItems.map(item => [item.variantDocumentId, item.quantity]).sort());
  }
  private savePending(): void {
    if (this.pending) sessionStorage.setItem(this.storageKey, JSON.stringify(this.pending));
  }
  private cartItems(): TransferItem[] {
    return this.cartStatusService.cartItems.map(item => ({variantDocumentId: item.variantDocumentId!, quantity: item.quantity}));
  }

  protected refreshQuote(): void {
    if (this.order || this.busy) return;
    this.errorMessage = '';
    this.quote = undefined;
    this.totalQuantity = this.cartStatusService.cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (!this.totalQuantity) { this.totalPrice = 0; return; }
    this.quoteLoading = true;
    // Upgrade carts saved before variant IDs were included, using current catalog data.
    const upgrades = this.cartStatusService.cartItems.map(item => item.variantDocumentId ? of(item)
      : this.productsService.getProductById(item.documentId || item.pid).pipe(map(product => {
        if (!product.variantDocumentId) throw new Error('A cart item is no longer available.');
        item.documentId = product.documentId;
        item.variantDocumentId = product.variantDocumentId;
        item.price = product.price;
        return item;
      })));
    this.cartSubscriptions.add(forkJoin(upgrades).pipe(
      switchMap(() => {
        this.cartStatusService.computeCart();
        return this.checkoutService.quote(this.cartItems());
      }),
      finalize(() => { this.quoteLoading = false; })
    ).subscribe({
      next: response => {
        this.quote = response.data;
        this.totalPrice = Number(response.data.grandTotal);
        this.totalQuantity = response.data.totalQuantity;
      },
      error: error => { this.errorMessage = this.errorText(error); }
    }));
  }

  protected refreshOrder(): void {
    if (!this.pending || this.busy) return;
    this.restoring = true;
    this.errorMessage = '';
    this.cartSubscriptions.add(this.checkoutService.findRequest(this.pending.key).pipe(
      finalize(() => { this.restoring = false; })
    ).subscribe({
      next: response => this.acceptOrder(response.data),
      error: error => {
        if (error.status === 404) this.refreshQuote();
        else this.errorMessage = this.errorText(error);
      }
    }));
  }

  private acceptOrder(order: TransferOrder): void {
    this.order = order;
    this.totalPrice = Number(order.grandTotal);
    this.totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    this.form.disable({emitEvent: false});
    if (this.pending) {
      this.pending.orderId = order.documentId;
      if (this.receiptSubmitted && !this.pending.cartCleared) {
        // A different/newer cart must survive recovery of an earlier order.
        if (this.pending.cartSignature === this.cartSignature()) {
          this.cartStatusService.cartItems = [];
          this.cartStatusService.computeCart();
        }
        this.pending.cartCleared = true;
      }
      this.savePending();
    }
    if (this.receiptSubmitted) {
      this.receipt = undefined;
      this.revokePreview();
    }
  }

  protected checkout(): void {
    if (this.busy || this.restoring || this.expired || this.receiptSubmitted) return;
    this.form.markAllAsTouched();
    if (!this.order && (this.form.invalid || !this.quote || !this.totalQuantity)) {
      this.errorMessage = 'Please check the required fields and refresh the order total before continuing.';
      return;
    }
    if (this.order && !this.receipt) { this.fileError = 'Please attach your payment receipt.'; return; }
    this.errorMessage = '';
    this.iconMode = 'CONFIRM';
    this.headerTitle = this.order ? 'Submit payment receipt?' : 'Create your order?';
    this.body = this.order ? 'Your receipt will be sent to the shop for review. Payment will remain pending until it is verified.'
      : 'Your items will be reserved and the final amount will be shown with the PromptPay QR code.';
    this.visible = true;
  }

  protected setCloseEvent(): void { this.visible = false; }
  protected setOkEvent(): void {
    this.visible = false;
    if (this.busy || this.expired || this.receiptSubmitted) return;
    if (this.order) this.sendReceipt();
    else this.createOrder();
  }

  private createOrder(): void {
    if (this.form.invalid || !this.quote) return;
    const customer = this.form.get('customer')!.value;
    const name = (customer.firstname.trim() + ' ' + customer.lastname.trim()).trim();
    const snapshot = (group: string): CheckoutAddress => {
      const address = this.form.get(group)!.value;
      return {recipientName: name, phone: customer.phone.trim(), addressLine1: address.street.trim(),
        subdistrict: address.subdistrict.trim(), district: address.district, province: address.province,
        postalCode: address.zipcode, countryCode: 'TH'};
    };
    const payload: TransferCheckout = {
      customer: {firstName: customer.firstname.trim(), lastName: customer.lastname.trim(), email: customer.email.trim()},
      shippingAddress: snapshot('shippingAddress'), billingAddress: snapshot('billingAddress'),
      items: this.cartItems(), expectedTotal: this.quote.grandTotal
    };
    if (!this.pending) this.pending = {key: crypto.randomUUID(), cartSignature: this.cartSignature()};
    this.savePending();
    this.busy = true;
    this.cartSubscriptions.add(this.checkoutService.createTransfer(payload, this.pending.key).pipe(
      finalize(() => { this.busy = false; })
    ).subscribe({
      next: response => this.acceptOrder(response.data),
      error: error => {
        this.errorMessage = this.errorText(error);
        if (error.error?.error?.details?.code === 'PRICE_CHANGED') this.quote = undefined;
      }
    }));
  }

  protected uploadFileToAttr(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.receipt = undefined;
    this.fileError = '';
    this.revokePreview();
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) {
      this.fileError = 'Choose a JPG, PNG or WebP image up to 5 MB.';
      input.value = '';
      return;
    }
    this.receipt = file;
    this.receiptPreview = URL.createObjectURL(file);
  }

  private sendReceipt(): void {
    if (!this.order || !this.receipt || this.expired) return;
    this.busy = true;
    this.errorMessage = '';
    this.cartSubscriptions.add(this.checkoutService.submitReceipt(this.order.documentId, this.receipt).pipe(
      finalize(() => { this.busy = false; })
    ).subscribe({
      next: response => this.acceptOrder(response.data),
      error: error => { this.errorMessage = this.errorText(error); }
    }));
  }

  protected startAgain(): void {
    if (this.busy || (this.order && !this.expired && !this.receiptSubmitted)) return;
    sessionStorage.removeItem(this.storageKey);
    this.pending = undefined;
    this.order = undefined;
    this.receipt = undefined;
    this.errorMessage = '';
    this.fileError = '';
    this.revokePreview();
    this.form.enable({emitEvent: false});
    this.refreshQuote();
  }

  private revokePreview(): void {
    if (this.receiptPreview) URL.revokeObjectURL(this.receiptPreview);
    this.receiptPreview = '';
  }
  private errorText(error: any): string {
    if (error.status === 401 || error.status === 403) return 'Your session has expired. Please log in again to continue.';
    return error.error?.error?.message || error.message || 'Unable to complete the request. Please try again.';
  }

  private initialAndSetDefaultAddresses(refresh = false): void {
    this.provinceRequest?.unsubscribe();
    this.addressLoading.provinces = true;
    this.addressErrors.provinces = '';
    for (const group of ['shippingAddress', 'billingAddress'] as const) {
      this.districtRequests[group]?.unsubscribe();
      this.addressLoading[group] = false;
      this.addressErrors[group] = '';
      this.form.get(group)?.patchValue({province: null, district: null});
    }
    this.shippingAddressDistrict = [];
    this.billingAddressDistrict = [];
    this.provinceRequest = this.addressesService.getProvinces(refresh).subscribe({
      next: provinces => {
        this.provinces = provinces;
        this.addressLoading.provinces = false;
        const provinceName = provinces[0]?.name ?? null;
        if (!provinceName) this.addressErrors.provinces = 'No provinces are available. Please try again later.';
        for (const group of ['shippingAddress', 'billingAddress'] as const) {
          this.form.get(group)?.get('province')?.setValue(provinceName);
          this.loadDistrictOptions(group);
        }
      },
      error: () => {
        this.provinces = [];
        this.addressLoading.provinces = false;
        this.addressErrors.provinces = 'Unable to load provinces. Please retry.';
      }
    });
  }

  protected selectProvinceOnShippingAddress($event: any): void {
    this.isCopy = false;
    this.loadDistrictOptions('shippingAddress');
  }

  protected selectProvinceOnBillingAddress($event: any): void {
    this.isCopy = false;
    this.loadDistrictOptions('billingAddress');
  }

  protected loadDistrictOptions(group: 'shippingAddress' | 'billingAddress'): void {
    this.districtRequests[group]?.unsubscribe();
    const control = this.form.get(group);
    const provinceName = control?.get('province')?.value;
    control?.get('district')?.setValue(null);
    if (group === 'shippingAddress') this.shippingAddressDistrict = [];
    else this.billingAddressDistrict = [];
    this.addressErrors[group] = '';
    this.addressLoading[group] = Boolean(provinceName);
    if (!provinceName) return;
    this.districtRequests[group] = this.addressesService.getDistrictsByProvinceName(provinceName).subscribe({
      next: districts => {
        if (group === 'shippingAddress') this.shippingAddressDistrict = districts;
        else this.billingAddressDistrict = districts;
        control?.get('district')?.setValue(districts[0]?.name ?? null);
        this.addressLoading[group] = false;
        if (!districts.length) this.addressErrors[group] = 'No districts are available for this province.';
      },
      error: () => {
        this.addressLoading[group] = false;
        this.addressErrors[group] = 'Unable to load districts. Please retry.';
      }
    });
  }

  protected retryAddressOptions(): void {
    this.initialAndSetDefaultAddresses(true);
  }

  ngOnDestroy(): void {
    this.provinceRequest?.unsubscribe();
    this.districtRequests.shippingAddress?.unsubscribe();
    this.districtRequests.billingAddress?.unsubscribe();
    this.cartSubscriptions.unsubscribe();
    clearInterval(this.clock);
    this.revokePreview();
  }

  protected copyShippingAddressToBillingAddress($event: any): void {
    const shippingAddressValues = this.form.get('shippingAddress')?.value // get form -> get value of form
    if ($event.target.checked) { // if user clicked my checkbox <input type="checkbox" (change)="copyShippingAddressToBillingAddress($event)">
      this.districtRequests.billingAddress?.unsubscribe();
      this.addressLoading.billingAddress = false;
      this.addressErrors.billingAddress = '';
      this.isCopy = true
      this.form.get('billingAddress')?.setValue(shippingAddressValues) // set billingAddress for-req-purchase (Cloning) , now billingAddress === shippingAddress
      // *** update cities
      this.billingAddressDistrict = this.shippingAddressDistrict
    } else { // means cancel clicked
      this.isCopy = false
      this.form.get('billingAddress')?.reset()
      // bug fix for cities (clearing values)
      this.billingAddressDistrict = [] // for empty array
    }
  }


}
