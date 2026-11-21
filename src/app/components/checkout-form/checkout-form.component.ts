import {Component, OnDestroy, OnInit} from '@angular/core';
import {forkJoin, map, of, Subscription, switchMap, finalize} from 'rxjs';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AddressesService} from '../../services/addresses.service';
import {CartStatusService} from '../../services/cart-status.service';
import {ProductsService} from '../../services/products.service';
import {WebStorageService} from '../../services/web-storage.service';
import {
  CheckoutAddress,
  CheckoutQuote,
  CheckoutService,
  TransferCheckout,
  TransferItem,
  TransferOrder
} from '../../services/checkout.service';
import {Province} from '../../entities/addresses/province';
import {District} from '../../entities/addresses/district';
import {ProfileService, UserProfile} from '../../services/profile.service';
import {AlertService} from '../../services/alert.service';
import {MenuLanguageService} from '../../services/menu-language.service';

interface PendingCheckout {
  key: string;
  orderId?: string;
  cartSignature: string;
  cartCleared?: boolean;
}

type PaymentMethod = 'bank' | 'promptpay' | 'card';

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
  protected paymentMethod: PaymentMethod = 'promptpay';
  protected copiedAccount = '';
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
  private profileRequest?: Subscription;
  private districtRequests: Partial<Record<'shippingAddress' | 'billingAddress', Subscription>> = {};
  private readonly cartSubscriptions = new Subscription();
  private clock?: ReturnType<typeof setInterval>;
  private savedProfileAddress: UserProfile['shippingAddress'] = null;

  constructor(private readonly addressesService: AddressesService,
              protected readonly cartStatusService: CartStatusService,
              private readonly checkoutService: CheckoutService,
              private readonly formBuilder: FormBuilder,
              private readonly storage: WebStorageService,
              private readonly productsService: ProductsService,
              private readonly profileService: ProfileService,
              private readonly alerts: AlertService,
              private readonly language: MenuLanguageService) {
  }

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
    this.loadProfileDefaults(user);
    this.initialAndSetDefaultAddresses();
    this.clock = setInterval(() => {
      this.now = Date.now();
    }, 1000);
    try {
      this.pending = JSON.parse(sessionStorage.getItem(this.storageKey) || 'null') || undefined;
    } catch {
      sessionStorage.removeItem(this.storageKey);
    }
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

  protected get paymentMethodLabel(): string {
    if (this.language.language() === 'th') {
      return {bank: 'โอนผ่านบัญชีธนาคาร', promptpay: 'PromptPay QR', card: 'บัตรเครดิต / เดบิต'}[this.paymentMethod];
    }
    return {bank: 'Bank transfer', promptpay: 'PromptPay QR', card: 'Credit / debit card'}[this.paymentMethod];
  }

  protected get transferTitle(): string {
    if (this.language.language() === 'th') {
      return this.paymentMethod === 'bank' ? 'โอนเงินและแนบสลิป' : 'สแกนและแนบสลิป';
    }
    return this.paymentMethod === 'bank' ? 'Transfer and attach your receipt' : 'Scan and attach your receipt';
  }

  protected selectPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod = method;
    this.copiedAccount = '';
  }

  protected copyAccount(account: string): void {
    const copied = navigator.clipboard?.writeText(account.replace(/-/g, ''));
    if (!copied) return;
    copied.then(() => {
      this.copiedAccount = account;
      setTimeout(() => this.copiedAccount = '', 1800);
    }).catch(() => {
      this.copiedAccount = '';
    });
  }

  protected get expired(): boolean {
    return !!this.order && (this.order.orderStatus === 'expired' ||
      (!this.receiptSubmitted && Date.parse(this.order.expiresAt) <= this.now));
  }

  protected get shippingTotal(): number {
    return Number(this.order?.shippingTotal ?? this.quote?.shippingTotal ?? 0);
  }

  protected get canRecoverOrder(): boolean {
    return Boolean(this.pending?.key);
  }

  protected get subtotal(): number {
    return Number(this.order?.subtotal ?? this.quote?.subtotal ?? 0);
  }

  private cartSignature(): string {
    return JSON.stringify(this.cartStatusService.cartItems.map(item => [item.variantDocumentId, item.quantity]).sort());
  }

  private savePending(): void {
    if (this.pending) sessionStorage.setItem(this.storageKey, JSON.stringify(this.pending));
  }

  private cartItems(): TransferItem[] {
    return this.cartStatusService.cartItems.map(item => ({
      variantDocumentId: item.variantDocumentId!,
      quantity: item.quantity
    }));
  }

  protected variantDescription(id: string): string {
    const item = this.cartStatusService.cartItems.find(row => row.variantDocumentId === id);
    return [item?.variantLabel, item?.sku ? `SKU ${item.sku}` : ''].filter(Boolean).join(' · ');
  }

  protected refreshQuote(): void {
    if (this.order || this.busy) return;
    this.errorMessage = '';
    this.quote = undefined;
    this.totalQuantity = this.cartStatusService.cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (!this.totalQuantity) {
      this.totalPrice = 0;
      return;
    }
    this.quoteLoading = true;
    // Upgrade carts saved before variant IDs were included, using current catalog data.
    const upgrades = this.cartStatusService.cartItems.map(item => item.variantDocumentId ? of(item)
      : this.productsService.getProductById(item.documentId || item.pid).pipe(map(product => {
        if ((product.variants?.length ?? 0) > 1) throw new Error('Please remove the older cart item and choose your preferred size again.');
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
      finalize(() => {
        this.quoteLoading = false;
      })
    ).subscribe({
      next: response => {
        this.quote = response.data;
        this.totalPrice = Number(response.data.grandTotal);
        this.totalQuantity = response.data.totalQuantity;
      },
      error: error => {
        this.errorMessage = this.errorText(error);
      }
    }));
  }

  protected refreshOrder(): void {
    if (!this.pending || this.busy) return;
    this.restoring = true;
    this.errorMessage = '';
    this.cartSubscriptions.add(this.checkoutService.findRequest(this.pending.key).pipe(
      finalize(() => {
        this.restoring = false;
      })
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
    if (this.paymentMethod === 'card') {
      this.errorMessage = this.language.language() === 'th'
        ? 'ระบบชำระด้วยบัตรกำลังจัดเตรียม กรุณาเลือกโอนผ่านบัญชีธนาคารหรือ PromptPay'
        : 'Card payments are being prepared. Please choose bank transfer or PromptPay.';
      return;
    }
    this.form.markAllAsTouched();
    if (!this.order && (this.form.invalid || !this.quote || !this.totalQuantity)) {
      this.errorMessage = 'Please check the required fields and refresh the order total before continuing.';
      return;
    }
    if (this.order && !this.receipt) {
      this.fileError = this.language.language() === 'th' ? 'กรุณาแนบหลักฐานการชำระเงิน' : 'Please attach your payment receipt.';
      return;
    }
    this.errorMessage = '';
    this.iconMode = 'CONFIRM';
    const thai = this.language.language() === 'th';
    this.headerTitle = this.order
      ? thai ? 'ยืนยันการส่งหลักฐานชำระเงิน?' : 'Submit payment receipt?'
      : thai ? 'ยืนยันการสร้างคำสั่งซื้อ?' : 'Create your order?';
    this.body = this.order
      ? thai
        ? 'หลักฐานการชำระเงินจะถูกส่งให้ร้านตรวจสอบ สถานะการชำระเงินจะรอการยืนยันจนกว่าร้านจะตรวจสอบเสร็จ'
        : 'Your receipt will be sent to the shop for review. Payment will remain pending until it is verified.'
      : this.paymentMethod === 'bank'
        ? thai
          ? 'สินค้าจะถูกจองไว้ และระบบจะแสดงรายละเอียดบัญชีธนาคารในขั้นตอนถัดไป'
          : 'Your items will be reserved and the bank account details will appear in the next step.'
        : thai
          ? 'สินค้าจะถูกจองไว้ และระบบจะแสดงยอดชำระพร้อม PromptPay QR ในขั้นตอนถัดไป'
          : 'Your items will be reserved and the final amount will be shown with the PromptPay QR code.';
    this.visible = true;
  }

  protected setCloseEvent(): void {
    this.visible = false;
  }

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
      return {
        recipientName: name, phone: customer.phone.trim(), addressLine1: address.street.trim(),
        subdistrict: address.subdistrict.trim(), district: address.district, province: address.province,
        postalCode: address.zipcode, countryCode: 'TH'
      };
    };
    const payload: TransferCheckout = {
      customer: {
        firstName: customer.firstname.trim(),
        lastName: customer.lastname.trim(),
        email: customer.email.trim()
      },
      shippingAddress: snapshot('shippingAddress'), billingAddress: snapshot('billingAddress'),
      items: this.cartItems(), expectedTotal: this.quote.grandTotal
    };
    if (!this.pending) this.pending = {key: crypto.randomUUID(), cartSignature: this.cartSignature()};
    this.savePending();
    this.busy = true;
    this.cartSubscriptions.add(this.checkoutService.createTransfer(payload, this.pending.key).pipe(
      finalize(() => {
        this.busy = false;
      })
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
      finalize(() => {
        this.busy = false;
      })
    ).subscribe({
      next: response => {
        this.acceptOrder(response.data);
        const thai = this.language.language() === 'th';
        this.alerts.show({
          header: thai ? 'ส่งหลักฐานชำระเงินสำเร็จ' : 'Payment receipt submitted',
          detail: thai
            ? `คำสั่งซื้อ ${response.data.orderNumber} อยู่ระหว่างรอร้านค้าตรวจสอบ`
            : `Order ${response.data.orderNumber} is awaiting the shop’s review.`,
          status: 'success',
        });
      },
      error: error => {
        this.errorMessage = this.errorText(error);
      }
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
        const savedProvince = this.savedProfileAddress?.province;
        const provinceName = provinces.find(province => province.name === savedProvince)?.name
          ?? provinces[0]?.name ?? null;
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

  private loadProfileDefaults(user: { username?: string } | null): void {
    if (!user) return;
    const cachedProfile = this.profileService.profile();
    if (cachedProfile) {
      this.applyProfileDefaults(cachedProfile);
      return;
    }
    this.profileRequest = this.profileService.get().subscribe({
      next: response => this.applyProfileDefaults(response.data),
      error: () => {
        // Profile data is optional; the checkout form remains usable with blank defaults.
      }
    });
  }

  private applyProfileDefaults(profile: UserProfile): void {
    const customer = this.form.get('customer');
    customer?.patchValue({
      firstname: profile.firstName || '',
      lastname: profile.lastName || '',
      email: profile.email || profile.username || customer?.get('email')?.value || '',
      phone: profile.phone || ''
    });

    this.savedProfileAddress = profile.shippingAddress;
    const savedAddress = profile.shippingAddress;
    if (!savedAddress) return;
    const values = {
      street: [savedAddress.addressLine1, savedAddress.addressLine2].filter(Boolean).join(' '),
      subdistrict: savedAddress.subdistrict || '',
      zipcode: savedAddress.postalCode || ''
    };
    this.form.get('shippingAddress')?.patchValue(values);
    this.form.get('billingAddress')?.patchValue(values);

    if (this.provinces.length && savedAddress.province &&
      this.provinces.some(province => province.name === savedAddress.province)) {
      for (const group of ['shippingAddress', 'billingAddress'] as const) {
        this.form.get(group)?.get('province')?.setValue(savedAddress.province);
        this.loadDistrictOptions(group);
      }
    }
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
        const savedDistrict = provinceName === this.savedProfileAddress?.province
          ? this.savedProfileAddress?.district
          : undefined;
        const matchingDistrict = districts.find(district =>
          district.value === savedDistrict || district.name === savedDistrict);
        control?.get('district')?.setValue(matchingDistrict?.value
          ?? matchingDistrict?.name
          ?? districts[0]?.value
          ?? districts[0]?.name
          ?? null);
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
    this.profileRequest?.unsubscribe();
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
