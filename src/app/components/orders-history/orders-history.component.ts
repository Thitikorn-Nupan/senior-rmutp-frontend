import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subscription, finalize} from 'rxjs';
import {CheckoutService, CustomerOrderSummary, TransferOrder} from '../../services/checkout.service';
import {environment} from '../../../environments/environment';

@Component({
  selector: 'app-orders-history',
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

  constructor(private readonly checkout: CheckoutService) {}
  ngOnInit(): void { this.load(); }
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
  protected reset(): void { this.search = ''; this.status = ''; this.load(); }
  protected openDetail(order: CustomerOrderSummary): void {
    if (this.uploading) return;
    if (this.selectedId === order.documentId) { this.closeDetail(); return; }
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
      next: response => { this.detail = response.data; this.updateSummary(response.data); },
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
      this.receiptError = 'กรุณาเลือกภาพ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB';
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
    if (!this.canPay(this.detail)) { this.fetchDetail(); return; }
    this.uploading = true;
    this.receiptError = '';
    this.uploadRequest = this.checkout.submitReceipt(this.detail.documentId, this.receipt).pipe(
      finalize(() => this.uploading = false)
    ).subscribe({
      next: response => {
        this.detail = response.data;
        this.updateSummary(response.data);
        this.receipt = undefined;
        this.receiptSuccess = 'ส่งหลักฐานแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบการชำระเงิน';
      },
      error: error => { this.receiptError = this.errorText(error); this.fetchDetail(); }
    });
  }
  private updateSummary(order: TransferOrder): void {
    this.orders = this.orders.map(row => row.documentId === order.documentId ?
      {...row, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus} : row);
  }
  protected orderLabel(status: string, paymentStatus: string): string {
    if (status === 'pending_payment' && paymentStatus === 'pending_review') return 'รอยืนยันการชำระเงิน';
    return ({pending_payment: 'รอชำระเงิน', confirmed: 'ยืนยันคำสั่งซื้อ', processing: 'กำลังเตรียมสินค้า',
      shipped: 'จัดส่งแล้ว', completed: 'สำเร็จ', cancelled: 'ยกเลิก', expired: 'หมดเวลาชำระเงิน',
      legacy_review: 'รอตรวจสอบข้อมูล'} as Record<string, string>)[status] || 'รอตรวจสอบข้อมูล';
  }
  protected paymentLabel(status: string): string {
    return ({unpaid: 'ยังไม่ชำระเงิน', pending_review: 'รอตรวจสอบสลิป', paid: 'ชำระเงินแล้ว',
      partially_refunded: 'คืนเงินบางส่วน', refunded: 'คืนเงินแล้ว', legacy_review: 'รอตรวจสอบข้อมูล'} as Record<string, string>)[status] || 'รอตรวจสอบข้อมูล';
  }
  protected image(source?: string): string {
    if (source) {
      try {
        const url = new URL(source, environment.strapiUrl);
        if (['http:', 'https:'].includes(url.protocol)) return url.href;
      } catch { /* Use placeholder for invalid snapshot URLs. */ }
    }
    return 'assets/images/product-placeholder.svg';
  }
  protected imageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/assets/images/product-placeholder.svg')) image.src = 'assets/images/product-placeholder.svg';
  }
  protected trackOrder(_: number, order: CustomerOrderSummary): string { return order.documentId; }
  protected firstItem(order: CustomerOrderSummary): CustomerOrderSummary['items'][number] | undefined {
    return order.items[0];
  }
  private errorText(error: {status?: number}): string {
    if (error.status === 401 || error.status === 403) return 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง';
    if (error.status === 404) return 'ไม่พบคำสั่งซื้อนี้ กรุณาโหลดประวัติใหม่';
    if (error.status === 400) return 'ข้อมูลหรือสถานะคำสั่งซื้อเปลี่ยนไป กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง';
    return 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง';
  }
}

