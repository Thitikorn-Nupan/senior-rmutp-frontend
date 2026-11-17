import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {Subscription, finalize} from 'rxjs';
import {SalesHistoryService, SalesOrder} from '../../services/sales-history.service';
import {environment} from '../../../environments/environment';

@Component({
  selector: 'app-order-history-admin',
  templateUrl: './order-history-admin.component.html',
  styleUrl: './order-history-admin.component.css'
})
export class OrderHistoryAdminComponent implements OnInit, OnDestroy {
  protected orders: SalesOrder[] = [];
  protected search = '';
  protected status = '';
  protected page = 1;
  protected pageCount = 0;
  protected total = 0;
  protected summary = {billTotal: '0.00', verifiedRevenue: '0.00', currency: 'THB'};
  protected loading = false;
  protected error = '';
  protected approving = '';
  protected receiptLoading = '';
  protected receiptViewLoading = false;
  protected receiptViewError = '';
  protected receiptPreviewUrl = '';
  protected receiptOrder?: SalesOrder;
  protected selected?: SalesOrder;
  private request?: Subscription;
  private receiptRequest?: Subscription;

  protected readonly statusOptions = [
    {name: 'ทุกสถานะ', value: ''}, {name: 'รอตรวจสอบสลิป', value: 'pending_review'},
    {name: 'รอชำระเงิน', value: 'pending_payment'}, {name: 'ยืนยันคำสั่งซื้อ', value: 'confirmed'},
    {name: 'กำลังเตรียมสินค้า', value: 'processing'}, {name: 'จัดส่งแล้ว', value: 'shipped'},
    {name: 'สำเร็จ', value: 'completed'}, {name: 'ยกเลิก', value: 'cancelled'}
  ] as const;

  constructor(private readonly sales: SalesHistoryService) {
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.receiptRequest?.unsubscribe();
    this.closeReceipt();
  }

  protected load(page = 1): void {
    this.request?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.page = page;
    this.request = this.sales.list(page, this.search, this.status).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: response => {
        this.orders = response.data;
        this.total = response.meta.pagination.total;
        this.pageCount = response.meta.pagination.pageCount;
        this.summary = response.summary;
      },
      error: error => this.error = error.status === 401 || error.status === 403
        ? 'ไม่มีสิทธิ์เข้าถึงประวัติการขาย' : 'ไม่สามารถโหลดประวัติการขายได้'
    });
  }

  protected reset(): void {
    this.search = '';
    this.status = '';
    this.load();
  }

  protected open(order: SalesOrder): void {
    this.selected = this.selected?.documentId === order.documentId ? undefined : order;
  }

  protected approve(order: SalesOrder): void {
    if (this.approving || !confirm(`ยืนยันการชำระเงินของ ${order.orderNumber} หรือไม่?`)) return;
    this.approving = order.documentId;
    this.sales.approve(order.documentId).pipe(finalize(() => this.approving = '')).subscribe({
      next: () => this.load(this.page),
      error: error => this.error = error.error?.error?.message || 'ไม่สามารถยืนยันการชำระเงินได้'
    });
  }

  protected downloadReceipt(order: SalesOrder): void {
    if (this.receiptLoading) return;
    this.receiptLoading = order.documentId;
    this.receiptRequest = this.sales.downloadReceipt(order.documentId).pipe(
      finalize(() => this.receiptLoading = '')
    ).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${order.orderNumber}-slip.png`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error = 'ไม่สามารถดาวน์โหลดสลิปได้'
    });
  }

  protected viewReceipt(order: SalesOrder): void {
    if (this.receiptViewLoading) return;
    this.closeReceipt();
    this.receiptOrder = order;
    this.receiptViewLoading = true;
    this.receiptViewError = '';
    this.receiptRequest = this.sales.downloadReceipt(order.documentId).pipe(
      finalize(() => this.receiptViewLoading = false)
    ).subscribe({
      next: blob => this.receiptPreviewUrl = URL.createObjectURL(blob),
      error: () => this.receiptViewError = 'ไม่สามารถเปิดดูสลิปได้'
    });
  }

  protected closeReceipt(): void {
    this.receiptRequest?.unsubscribe();
    this.receiptRequest = undefined;
    if (this.receiptPreviewUrl) URL.revokeObjectURL(this.receiptPreviewUrl);
    this.receiptPreviewUrl = '';
    this.receiptOrder = undefined;
    this.receiptViewLoading = false;
    this.receiptViewError = '';
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.receiptOrder) this.closeReceipt();
  }

  protected image(source?: string): string {
    if (!source) return 'assets/images/product-placeholder.svg';
    try {
      return new URL(source, environment.strapiUrl).href;
    } catch {
      return 'assets/images/product-placeholder.svg';
    }
  }

  protected statusLabel(order: SalesOrder): string {
    if (order.paymentStatus === 'pending_review') return 'รอตรวจสอบสลิป';
    return ({
      pending_payment: 'รอชำระเงิน', confirmed: 'ยืนยันคำสั่งซื้อ', processing: 'กำลังเตรียมสินค้า',
      shipped: 'จัดส่งแล้ว', completed: 'สำเร็จ', cancelled: 'ยกเลิก', expired: 'หมดเวลาชำระเงิน'
    } as Record<string, string>)[order.orderStatus] || order.orderStatus;
  }

  protected statusClass(order: SalesOrder): string {
    if (order.paymentStatus === 'pending_review') return 'review';
    return order.orderStatus;
  }

  protected money(order: SalesOrder): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: order.currency || 'THB'
    }).format(Number(order.grandTotal));
  }

  protected track(_: number, order: SalesOrder): string {
    return order.documentId;
  }
}
