import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subscription, finalize} from 'rxjs';
import {CheckoutService, CustomerOrderSummary, TransferOrder} from '../../services/checkout.service';
import {environment} from '../../../environments/environment';
import {MenuLanguageService} from '../../services/menu-language.service';

const historyText = {
  th: {
    account: 'บัญชีของฉัน', title: 'ประวัติคำสั่งซื้อ', intro: 'ติดตามสถานะ ดูรายละเอียด และตรวจสอบการชำระเงินของคุณ', shop: 'เลือกซื้อสินค้า',
    search: 'ค้นหาเลขคำสั่งซื้อ', searchPlaceholder: 'เช่น PS-…', status: 'สถานะ', all: 'ทั้งหมด', submit: 'ค้นหา', reset: 'ล้างตัวกรอง',
    orders: 'รายการคำสั่งซื้อ', loading: 'กำลังโหลดประวัติคำสั่งซื้อ…', retry: 'ลองอีกครั้ง', login: 'เข้าสู่ระบบ', found: 'พบ', ordersSuffix: 'คำสั่งซื้อ', newest: 'เรียงจากล่าสุด',
    noFilterResults: 'ไม่พบคำสั่งซื้อที่ตรงกับตัวกรอง', noFilterHelp: 'ลองค้นหาด้วยเลขคำสั่งซื้ออื่น หรือแสดงสถานะทั้งหมด', noOrders: 'ยังไม่มีคำสั่งซื้อ', noOrdersHelp: 'เมื่อสั่งซื้อสินค้าแล้ว คุณสามารถติดตามสถานะได้ที่นี่', showAll: 'แสดงทั้งหมด',
    orderNumber: 'เลขคำสั่งซื้อ', productOrder: 'คำสั่งซื้อสินค้า', pieces: 'ชิ้น', entries: 'รายการ', total: 'ยอดรวม', close: 'ปิดรายละเอียด', details: 'ดูรายละเอียด', orderDetails: 'รายละเอียดคำสั่งซื้อ',
    loadingDetails: 'กำลังโหลดรายละเอียด…', orderedProducts: 'สินค้าที่สั่งซื้อ', shippingAddress: 'ที่อยู่จัดส่ง', noShippingAddress: 'ไม่มีข้อมูลที่อยู่จัดส่ง', tracking: 'เลขพัสดุ:', shippedAt: 'จัดส่งเมื่อ',
    subtotal: 'ยอดสินค้า', shipping: 'ค่าจัดส่ง', discount: 'ส่วนลด', tax: 'ภาษี', grandTotal: 'ยอดสุทธิ', payment: 'การชำระเงิน', bankTransfer: 'โอนเงินผ่านธนาคาร',
    paymentReference: 'เลขอ้างอิงการชำระเงิน:', receiptReceived: 'ได้รับหลักฐานแล้ว เจ้าหน้าที่กำลังตรวจสอบการชำระเงิน', receiptSentAt: 'ส่งหลักฐานเมื่อ', expiredOrder: 'คำสั่งซื้อนี้หมดเวลาชำระเงินแล้ว กรุณาสั่งซื้อใหม่',
    receiptHelp: 'หากโอนเงินแล้ว สามารถแนบสลิปได้ที่นี่ ภายใน', receipt: 'หลักฐานการโอนเงิน', imageRules: 'JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB', sending: 'กำลังส่งหลักฐาน…', sendReceipt: 'ส่งหลักฐานการโอนเงิน',
    previous: 'ก่อนหน้า', page: 'หน้า', of: 'จาก', next: 'ถัดไป', pendingPayment: 'รอชำระเงิน', pendingReview: 'รอตรวจสอบสลิป', confirmed: 'ยืนยันคำสั่งซื้อ', processing: 'กำลังเตรียมสินค้า', shipped: 'จัดส่งแล้ว', completed: 'สำเร็จ', cancelled: 'ยกเลิก', expired: 'หมดเวลาชำระเงิน', legacy: 'รอตรวจสอบข้อมูล', pendingConfirmation: 'รอยืนยันการชำระเงิน', unpaid: 'ยังไม่ชำระเงิน', paid: 'ชำระเงินแล้ว', partialRefund: 'คืนเงินบางส่วน', refunded: 'คืนเงินแล้ว',
    invalidReceipt: 'กรุณาเลือกภาพ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB', receiptSuccess: 'ส่งหลักฐานแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบการชำระเงิน', sessionExpired: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', notFound: 'ไม่พบคำสั่งซื้อนี้ กรุณาโหลดประวัติใหม่', changed: 'ข้อมูลหรือสถานะคำสั่งซื้อเปลี่ยนไป กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง', connection: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง'
  },
  en: {
    account: 'MY ACCOUNT', title: 'Order history', intro: 'Track your order status, view details, and check your payment.', shop: 'Continue shopping',
    search: 'Search order number', searchPlaceholder: 'e.g. PS-…', status: 'Status', all: 'All statuses', submit: 'Search', reset: 'Clear filters',
    orders: 'Orders', loading: 'Loading order history…', retry: 'Try again', login: 'Log in', found: 'Found', ordersSuffix: 'orders', newest: 'Newest first',
    noFilterResults: 'No orders match your filters', noFilterHelp: 'Try another order number or show every status.', noOrders: 'No orders yet', noOrdersHelp: 'Your orders will appear here after you make a purchase.', showAll: 'Show all',
    orderNumber: 'Order number', productOrder: 'Product order', pieces: 'items', entries: 'products', total: 'Total', close: 'Close details', details: 'View details', orderDetails: 'Order details',
    loadingDetails: 'Loading details…', orderedProducts: 'Ordered products', shippingAddress: 'Shipping address', noShippingAddress: 'No shipping address is available', tracking: 'Tracking number:', shippedAt: 'Shipped on',
    subtotal: 'Subtotal', shipping: 'Shipping', discount: 'Discount', tax: 'Tax', grandTotal: 'Grand total', payment: 'Payment', bankTransfer: 'Bank transfer',
    paymentReference: 'Payment reference:', receiptReceived: 'Your receipt was received and is being reviewed.', receiptSentAt: 'Receipt submitted on', expiredOrder: 'This payment window has expired. Please place a new order.',
    receiptHelp: 'If you have transferred the payment, attach your receipt here by', receipt: 'Transfer receipt', imageRules: 'JPG, PNG, or WebP up to 5 MB', sending: 'Submitting receipt…', sendReceipt: 'Submit transfer receipt',
    previous: 'Previous', page: 'Page', of: 'of', next: 'Next', pendingPayment: 'Pending payment', pendingReview: 'Receipt under review', confirmed: 'Order confirmed', processing: 'Preparing order', shipped: 'Shipped', completed: 'Completed', cancelled: 'Cancelled', expired: 'Payment expired', legacy: 'Needs review', pendingConfirmation: 'Payment awaiting confirmation', unpaid: 'Unpaid', paid: 'Paid', partialRefund: 'Partially refunded', refunded: 'Refunded',
    invalidReceipt: 'Choose a JPG, PNG, or WebP image up to 5 MB.', receiptSuccess: 'Receipt submitted. Please wait for payment review.', sessionExpired: 'Your session has expired. Please log in again.', notFound: 'This order was not found. Please refresh your history.', changed: 'The order information or status changed. Please review it and try again.', connection: 'Unable to connect. Please try again.'
  }
} as const;

@Component({
  selector: 'app-orders-history',
  host: {'[attr.lang]': 'language.language()'},
  templateUrl: './orders-history.component.html',
  styleUrls: ['./orders-history.component.css', './orders-history-detail.css', './orders-history-controls.css']
})
export class OrdersHistoryComponent implements OnInit, OnDestroy {
  protected orders: CustomerOrderSummary[] = [];
  protected search = '';
  protected status = '';
  protected page = 1;
  protected pageCount = 0;
  protected total = 0;
  protected loading = false;
  protected error = '';
  protected selectedId = '';
  protected detail?: TransferOrder;
  protected detailLoading = false;
  protected detailError = '';
  protected uploading = false;
  protected receipt?: File;
  protected receiptError = '';
  protected receiptSuccess = '';
  private listRequest?: Subscription;
  private detailRequest?: Subscription;
  private uploadRequest?: Subscription;

  constructor(private readonly checkout: CheckoutService,
              protected readonly language: MenuLanguageService) {
  }

  protected get text(): Record<keyof typeof historyText.en, string> {
    return historyText[this.language.language()];
  }

  protected get statusOptions(): { name: string; value: string }[] {
    const t = this.text;
    return [{name: t.all, value: ''}, {name: t.pendingPayment, value: 'pending_payment'}, {name: t.pendingReview, value: 'pending_review'}, {name: t.confirmed, value: 'confirmed'}, {name: t.processing, value: 'processing'}, {name: t.shipped, value: 'shipped'}, {name: t.completed, value: 'completed'}, {name: t.cancelled, value: 'cancelled'}, {name: t.expired, value: 'expired'}, {name: t.legacy, value: 'legacy_review'}];
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.listRequest?.unsubscribe();
    this.detailRequest?.unsubscribe();
    this.uploadRequest?.unsubscribe();
  }

  protected load(page = 1): void {
    if (this.uploading) return;
    this.listRequest?.unsubscribe();
    this.closeDetail();
    this.loading = true;
    this.error = '';
    this.orders = [];
    this.page = page;
    this.listRequest = this.checkout.history(page, this.search.trim(), this.status).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: response => {
        this.orders = response.data;
        this.pageCount = response.meta.pagination.pageCount;
        this.total = response.meta.pagination.total;
      },
      error: error => this.error = this.errorText(error)
    });
  }

  protected reset(): void {
    this.search = '';
    this.status = '';
    this.load();
  }

  protected openDetail(order: CustomerOrderSummary): void {
    if (this.uploading) return;
    if (this.selectedId === order.documentId) {
      this.closeDetail();
      return;
    }
    this.closeDetail();
    this.selectedId = order.documentId;
    this.fetchDetail();
  }

  protected fetchDetail(): void {
    this.detailRequest?.unsubscribe();
    this.detailLoading = true;
    this.detailError = '';
    this.detailRequest = this.checkout.getOrder(this.selectedId).pipe(
      finalize(() => this.detailLoading = false)
    ).subscribe({
      next: response => {
        this.detail = response.data;
        this.updateSummary(response.data);
      },
      error: error => this.detailError = this.errorText(error)
    });
  }

  protected closeDetail(): void {
    if (this.uploading) return;
    this.detailRequest?.unsubscribe();
    this.selectedId = '';
    this.detail = undefined;
    this.detailError = '';
    this.receipt = undefined;
    this.receiptError = '';
    this.receiptSuccess = '';
  }

  protected chooseReceipt(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.receipt = undefined;
    this.receiptError = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) {
      this.receiptError = this.text.invalidReceipt;
      input.value = '';
      return;
    }
    this.receipt = file;
  }

  protected canPay(order: TransferOrder): boolean {
    return order.orderStatus === 'pending_payment' && order.paymentStatus === 'unpaid' &&
      order.payment?.method === 'bank_transfer' && Date.parse(order.expiresAt) > Date.now();
  }

  protected submitReceipt(): void {
    if (!this.detail || !this.receipt || this.uploading) return;
    if (!this.canPay(this.detail)) {
      this.fetchDetail();
      return;
    }
    this.uploading = true;
    this.receiptError = '';
    this.uploadRequest = this.checkout.submitReceipt(this.detail.documentId, this.receipt).pipe(
      finalize(() => this.uploading = false)
    ).subscribe({
      next: response => {
        this.detail = response.data;
        this.updateSummary(response.data);
        this.receipt = undefined;
        this.receiptSuccess = this.text.receiptSuccess;
      },
      error: error => {
        this.receiptError = this.errorText(error);
        this.fetchDetail();
      }
    });
  }

  private updateSummary(order: TransferOrder): void {
    this.orders = this.orders.map(row => row.documentId === order.documentId ?
      {...row, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus} : row);
  }

  protected orderLabel(status: string, paymentStatus: string): string {
    const t = this.text;
    if (status === 'pending_payment' && paymentStatus === 'pending_review') return t.pendingConfirmation;
    return ({
      pending_payment: t.pendingPayment, confirmed: t.confirmed, processing: t.processing,
      shipped: t.shipped, completed: t.completed, cancelled: t.cancelled, expired: t.expired,
      legacy_review: t.legacy
    } as Record<string, string>)[status] || t.legacy;
  }

  protected paymentLabel(status: string): string {
    const t = this.text;
    return ({
      unpaid: t.unpaid, pending_review: t.pendingReview, paid: t.paid,
      partially_refunded: t.partialRefund, refunded: t.refunded, legacy_review: t.legacy
    } as Record<string, string>)[status] || t.legacy;
  }

  protected image(source?: string): string {
    if (source) {
      try {
        const url = new URL(source, environment.strapiUrl);
        if (['http:', 'https:'].includes(url.protocol)) return url.href;
      } catch { /* Use placeholder for invalid snapshot URLs. */
      }
    }
    return 'assets/images/product-placeholder.svg';
  }

  protected imageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/assets/images/product-placeholder.svg')) image.src = 'assets/images/product-placeholder.svg';
  }

  protected trackOrder(_: number, order: CustomerOrderSummary): string {
    return order.documentId;
  }

  protected firstItem(order: CustomerOrderSummary): CustomerOrderSummary['items'][number] | undefined {
    return order.items[0];
  }

  private errorText(error: { status?: number }): string {
    if (error.status === 401 || error.status === 403) return this.text.sessionExpired;
    if (error.status === 404) return this.text.notFound;
    if (error.status === 400) return this.text.changed;
    return this.text.connection;
  }
}
