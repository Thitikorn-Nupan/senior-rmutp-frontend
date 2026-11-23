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

const checkoutText = {
  en: {
    backToCart: 'Back to your cart', finalDetails: 'THE FINAL DETAILS', makeItYours: 'Make it yours',
    intro: "Tell us where to send your fragrances and choose how you'd like to pay.", secureCheckout: 'Secure checkout', secureCheckoutDetail: 'Your order details are protected', refreshTotal: 'Refresh total',
    checkExistingOrder: 'Check existing order', loginAgain: 'Login again', cartEmpty: 'Your cart is empty',
    exploreCollection: 'Explore the collection', requiredFields: 'Fields marked * are required.', loadingProvinces: 'Loading provinces…',
    retry: 'Retry', details: 'Your details', receivingOrder: 'Who will be receiving this order?', firstName: 'First name',
    lastName: 'Last name', emailAddress: 'Email address', phoneNumber: 'Phone number', enterFirstName: 'Please enter your first name.',
    enterLastName: 'Please enter your last name.', enterEmail: 'Please enter your email address.', validPhone: 'Please enter a valid phone number.',
    shippingAddress: 'Shipping address', deliveryAddress: 'Where should your order be delivered?', streetAddress: 'Street address',
    streetPlaceholder: 'House number, building and street', enterStreet: 'Please enter the street address.', province: 'Province',
    selectProvince: 'Select province', selectProvinceError: 'Please select a province.', district: 'District', loadingDistricts: 'Loading districts…',
    selectDistrict: 'Select district', selectDistrictError: 'Please select a district.', subdistrict: 'Subdistrict / Khwaeng',
    subdistrictPlaceholder: 'Enter subdistrict or khwaeng', validSubdistrict: 'Please enter a valid subdistrict / khwaeng.', postalCode: 'Postal code',
    postalPlaceholder: 'e.g. 10200', enterPostalCode: 'Please enter the postal code.', billingAddress: 'Billing address',
    billingDescription: 'Review the address for your payment details.', copyShipping: 'Copy current shipping address',
    copyShippingDetail: 'You can review or edit the copied details below.', billingStreetPlaceholder: 'House number, building, street and subdistrict',
    choosePayment: 'Choose payment method', choosePaymentDetail: 'Select the method that is most convenient for you.', paymentMethod: 'Payment method',
    bankTransfer: 'Bank transfer', bankTransferDetail: 'Transfer to the shop account, then attach your receipt.', promptPayDetail: 'Scan the shop QR code and attach your receipt.',
    card: 'Credit / debit card', cardDetail: 'Secure card checkout will be available soon.', createOrderFirst: 'Create your order first. We will show the total and let you attach a payment receipt in the next step.',
    copied: 'Copied', copy: 'Copy', promptPayFirst: 'Create your order first, then scan the PromptPay QR code and attach your receipt.',
    cardPreparing: 'Card payments are being prepared', cardHelp: 'Please choose bank transfer or PromptPay to complete this order today.', checkingOrder: 'Checking your existing order…',
    receiptReceived: 'RECEIPT RECEIVED', paymentAwaitingReview: 'Thank you. Your payment is awaiting review.', receiptSaved: 'Your order has been saved. The shop will verify your receipt before confirming payment.',
    continueShopping: 'Continue shopping', checkoutAnother: 'Checkout another order', order: 'ORDER', savedDetails: 'Your saved details', shipTo: 'Ship to',
    viewBilling: 'View billing address', paymentExpired: 'This payment window has expired', expiredHelp: 'If you have already transferred money, contact the shop before placing another order.',
    refreshStatus: 'Refresh status', returnCheckout: 'Return to checkout', reservedItems: 'Your items are reserved while you complete payment.', submitBy: 'Submit your receipt by',
    amountToTransfer: 'Amount to transfer', bankTransferHelp: 'Transfer the exact amount to either account above, then attach the receipt for review.',
    promptPayHelp: 'Scan with your banking app and enter the exact total shown above. Then attach the receipt for review.', receipt: 'Payment receipt', receiptHelp: 'JPG, PNG or WebP · Up to 5 MB',
    receiptPreview: 'Preview of the selected payment receipt', orderSummary: 'ORDER SUMMARY', lastLook: 'ONE LAST LOOK', yourOrder: 'Your order', editCart: 'Edit cart',
    checkingPrices: 'Checking prices and availability…', items: 'Items', subtotal: 'Subtotal', shipping: 'Shipping', free: 'Free', total: 'Total',
    pleaseWait: 'Please wait…', cardSoon: 'Card payments coming soon', submitReceipt: 'Submit receipt for review', createBankOrder: 'Create order & show bank details',
    createQrOrder: 'Create order & show QR', pendingReview: 'Payment pending review. Keep your order number for reference.', paymentPending: 'Your payment will be marked pending until the shop verifies your receipt.',
    priceCalculated: 'The amount is calculated from current product prices by the shop.', requiredCheckout: 'Please check the required fields and refresh the order total before continuing.',
    invalidReceipt: 'Choose a JPG, PNG or WebP image up to 5 MB.', sessionExpired: 'Your session has expired. Please log in again to continue.',
    unavailable: 'Unable to complete the request. Please try again.', noProvinces: 'No provinces are available. Please try again later.', loadProvinces: 'Unable to load provinces. Please retry.',
    noDistricts: 'No districts are available for this province.', loadDistricts: 'Unable to load districts. Please retry.'
  },
  th: {
    backToCart: 'กลับไปยังตะกร้าสินค้า', finalDetails: 'รายละเอียดขั้นสุดท้าย', makeItYours: 'สั่งซื้อสินค้าของคุณ',
    intro: 'ระบุที่อยู่จัดส่งและเลือกวิธีชำระเงินที่คุณสะดวก', secureCheckout: 'ชำระเงินอย่างปลอดภัย', secureCheckoutDetail: 'ข้อมูลคำสั่งซื้อของคุณได้รับการปกป้อง', refreshTotal: 'คำนวณยอดรวมใหม่', checkExistingOrder: 'ตรวจสอบคำสั่งซื้อเดิม', loginAgain: 'เข้าสู่ระบบอีกครั้ง', cartEmpty: 'ตะกร้าสินค้าของคุณว่าง',
    exploreCollection: 'เลือกชมสินค้า', requiredFields: 'ช่องที่มีเครื่องหมาย * จำเป็นต้องกรอก', loadingProvinces: 'กำลังโหลดจังหวัด…', retry: 'ลองใหม่',
    details: 'ข้อมูลผู้สั่งซื้อ', receivingOrder: 'ใครจะเป็นผู้รับคำสั่งซื้อนี้?', firstName: 'ชื่อ', lastName: 'นามสกุล', emailAddress: 'อีเมล', phoneNumber: 'หมายเลขโทรศัพท์',
    enterFirstName: 'กรุณากรอกชื่อ', enterLastName: 'กรุณากรอกนามสกุล', enterEmail: 'กรุณากรอกอีเมล', validPhone: 'กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง',
    shippingAddress: 'ที่อยู่จัดส่ง', deliveryAddress: 'ต้องการให้จัดส่งคำสั่งซื้อไปที่ใด?', streetAddress: 'บ้านเลขที่ / ถนน', streetPlaceholder: 'บ้านเลขที่ อาคาร และถนน',
    enterStreet: 'กรุณากรอกที่อยู่', province: 'จังหวัด', selectProvince: 'เลือกจังหวัด', selectProvinceError: 'กรุณาเลือกจังหวัด', district: 'อำเภอ / เขต', loadingDistricts: 'กำลังโหลดอำเภอ / เขต…',
    selectDistrict: 'เลือกอำเภอ / เขต', selectDistrictError: 'กรุณาเลือกอำเภอ / เขต', subdistrict: 'ตำบล / แขวง', subdistrictPlaceholder: 'กรอกตำบลหรือแขวง',
    validSubdistrict: 'กรุณากรอกตำบลหรือแขวงให้ถูกต้อง', postalCode: 'รหัสไปรษณีย์', postalPlaceholder: 'เช่น 10200', enterPostalCode: 'กรุณากรอกรหัสไปรษณีย์',
    billingAddress: 'ที่อยู่สำหรับออกใบเสร็จ', billingDescription: 'ตรวจสอบที่อยู่สำหรับรายละเอียดการชำระเงิน', copyShipping: 'ใช้ที่อยู่จัดส่งปัจจุบัน',
    copyShippingDetail: 'คุณสามารถตรวจสอบหรือแก้ไขรายละเอียดที่คัดลอกไว้ด้านล่าง', billingStreetPlaceholder: 'บ้านเลขที่ อาคาร ถนน และตำบล / แขวง',
    choosePayment: 'เลือกวิธีชำระเงิน', choosePaymentDetail: 'เลือกวิธีที่สะดวกสำหรับคุณ', paymentMethod: 'วิธีชำระเงิน',
    bankTransfer: 'โอนผ่านบัญชีธนาคาร', bankTransferDetail: 'โอนเงินเข้าบัญชีร้านค้า แล้วแนบหลักฐานการชำระเงิน', promptPayDetail: 'สแกน QR ของร้านค้า แล้วแนบหลักฐานการชำระเงิน',
    card: 'บัตรเครดิต / เดบิต', cardDetail: 'ระบบชำระเงินด้วยบัตรจะพร้อมใช้งานเร็ว ๆ นี้', createOrderFirst: 'สร้างคำสั่งซื้อก่อน ระบบจะแสดงยอดชำระและให้คุณแนบหลักฐานการชำระเงินในขั้นตอนถัดไป',
    copied: 'คัดลอกแล้ว', copy: 'คัดลอก', promptPayFirst: 'สร้างคำสั่งซื้อก่อน จากนั้นสแกน PromptPay QR และแนบหลักฐานการชำระเงิน',
    cardPreparing: 'ระบบชำระเงินด้วยบัตรกำลังจัดเตรียม', cardHelp: 'กรุณาเลือกโอนผ่านบัญชีธนาคารหรือ PromptPay เพื่อชำระเงินวันนี้', checkingOrder: 'กำลังตรวจสอบคำสั่งซื้อเดิม…',
    receiptReceived: 'ได้รับหลักฐานการชำระเงินแล้ว', paymentAwaitingReview: 'ขอบคุณ ระบบกำลังรอตรวจสอบการชำระเงินของคุณ', receiptSaved: 'บันทึกคำสั่งซื้อแล้ว ร้านค้าจะตรวจสอบหลักฐานก่อนยืนยันการชำระเงิน',
    continueShopping: 'เลือกซื้อสินค้าต่อ', checkoutAnother: 'สั่งซื้อรายการอื่น', order: 'คำสั่งซื้อ', savedDetails: 'รายละเอียดที่บันทึกไว้', shipTo: 'จัดส่งไปที่',
    viewBilling: 'ดูที่อยู่สำหรับออกใบเสร็จ', paymentExpired: 'หมดเวลาสำหรับการชำระเงินนี้', expiredHelp: 'หากคุณโอนเงินแล้ว โปรดติดต่อร้านค้าก่อนสร้างคำสั่งซื้อใหม่',
    refreshStatus: 'รีเฟรชสถานะ', returnCheckout: 'กลับไปหน้าชำระเงิน', reservedItems: 'สินค้าของคุณถูกจองไว้ระหว่างดำเนินการชำระเงิน', submitBy: 'ส่งหลักฐานการชำระเงินภายใน',
    amountToTransfer: 'ยอดที่ต้องโอน', bankTransferHelp: 'โอนเงินตามยอดที่ระบุไปยังบัญชีข้างต้น แล้วแนบหลักฐานเพื่อให้ร้านค้าตรวจสอบ',
    promptPayHelp: 'สแกนด้วยแอปธนาคารและชำระตามยอดที่แสดง จากนั้นแนบหลักฐานเพื่อให้ร้านค้าตรวจสอบ', receipt: 'หลักฐานการชำระเงิน', receiptHelp: 'JPG, PNG หรือ WebP · ขนาดไม่เกิน 5 MB',
    receiptPreview: 'ตัวอย่างหลักฐานการชำระเงินที่เลือก', orderSummary: 'สรุปคำสั่งซื้อ', lastLook: 'ตรวจสอบอีกครั้ง', yourOrder: 'คำสั่งซื้อของคุณ', editCart: 'แก้ไขตะกร้าสินค้า',
    checkingPrices: 'กำลังตรวจสอบราคาและสินค้า…', items: 'รายการ', subtotal: 'ยอดรวมสินค้า', shipping: 'ค่าจัดส่ง', free: 'ฟรี', total: 'ยอดรวม',
    pleaseWait: 'กรุณารอสักครู่…', cardSoon: 'ระบบบัตรจะพร้อมใช้งานเร็ว ๆ นี้', submitReceipt: 'ส่งหลักฐานให้ตรวจสอบ', createBankOrder: 'สร้างคำสั่งซื้อและดูบัญชีธนาคาร',
    createQrOrder: 'สร้างคำสั่งซื้อและดู QR', pendingReview: 'รอตรวจสอบการชำระเงิน โปรดเก็บหมายเลขคำสั่งซื้อไว้อ้างอิง', paymentPending: 'สถานะการชำระเงินจะรอการยืนยันจนกว่าร้านค้าจะตรวจสอบหลักฐาน',
    priceCalculated: 'ร้านค้าคำนวณยอดเงินจากราคาสินค้าปัจจุบัน', requiredCheckout: 'กรุณาตรวจสอบช่องที่จำเป็นและคำนวณยอดคำสั่งซื้อใหม่ก่อนดำเนินการต่อ',
    invalidReceipt: 'กรุณาเลือกไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB', sessionExpired: 'เซสชันของคุณหมดอายุแล้ว โปรดเข้าสู่ระบบอีกครั้งเพื่อดำเนินการต่อ',
    unavailable: 'ไม่สามารถดำเนินการได้ โปรดลองอีกครั้ง', noProvinces: 'ไม่มีข้อมูลจังหวัด โปรดลองอีกครั้งภายหลัง', loadProvinces: 'ไม่สามารถโหลดข้อมูลจังหวัดได้ โปรดลองใหม่',
    noDistricts: 'ไม่มีข้อมูลอำเภอ / เขตสำหรับจังหวัดนี้', loadDistricts: 'ไม่สามารถโหลดข้อมูลอำเภอ / เขตได้ โปรดลองใหม่'
  }
} as const;

@Component({
  selector: 'app-checkout-form',
  host: {'[attr.lang]': 'language.language()'},
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
              protected readonly language: MenuLanguageService) {
  }

  protected get text(): Record<keyof typeof checkoutText.en, string> {
    return checkoutText[this.language.language()];
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
      this.errorMessage = this.text.requiredCheckout;
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
      this.fileError = this.text.invalidReceipt;
      input.value = '';
      return;
    }
    this.receipt = file;
    this.receiptPreview = URL.createObjectURL(file);
  }

  private sendReceipt(): void {
    if (!this.order || !this.receipt || this.expired) {
      return;
    }
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
    if (this.busy || (this.order && !this.expired && !this.receiptSubmitted)) {
      return;
    }
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
    if (error.status === 401 || error.status === 403) return this.text.sessionExpired;
    return error.error?.error?.message || error.message || this.text.unavailable;
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
        if (!provinceName) this.addressErrors.provinces = this.text.noProvinces;
        for (const group of ['shippingAddress', 'billingAddress'] as const) {
          this.form.get(group)?.get('province')?.setValue(provinceName);
          this.loadDistrictOptions(group);
        }
      },
      error: () => {
        this.provinces = [];
        this.addressLoading.provinces = false;
        this.addressErrors.provinces = this.text.loadProvinces;
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
        if (!districts.length) this.addressErrors[group] = this.text.noDistricts;
      },
      error: () => {
        this.addressLoading[group] = false;
        this.addressErrors[group] = this.text.loadDistricts;
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
