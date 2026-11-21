import {CommonModule} from '@angular/common';
import {Component, computed, inject, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {finalize, Subscription} from 'rxjs';
import {MemberManagementService, MemberOrder, SystemMember} from '../../services/member-management.service';
import {MenuLanguageService} from '../../services/menu-language.service';

const copy = {
  th: {
    eyebrow: 'ตั้งค่าระบบ',
    title: 'จัดการข้อมูลสมาชิก',
    intro: 'ค้นหาและตรวจสอบรายการสั่งซื้อของสมาชิกแต่ละคน',
    members: 'สมาชิกทั้งหมด',
    searchLabel: 'ค้นหาสมาชิก',
    searchPlaceholder: 'ชื่อ, อีเมล หรือเบอร์โทรศัพท์',
    search: 'ค้นหา',
    clear: 'ล้างตัวกรอง',
    loading: 'กำลังโหลดข้อมูลสมาชิก…',
    retry: 'ลองอีกครั้ง',
    emptyTitle: 'ไม่พบข้อมูลสมาชิก',
    emptyDetail: 'ลองค้นหาด้วยชื่อ อีเมล หรือเบอร์โทรศัพท์อื่น',
    orders: 'คำสั่งซื้อ',
    noOrders: 'สมาชิกคนนี้ยังไม่มีคำสั่งซื้อ',
    registered: 'สมัครเมื่อ',
    phone: 'โทร.',
    previous: 'ก่อนหน้า',
    next: 'ถัดไป',
    page: 'หน้า',
    orderNumber: 'เลขคำสั่งซื้อ',
    items: 'รายการ',
    pendingPayment: 'รอชำระเงิน',
    pendingReview: 'รอตรวจสอบสลิป',
    confirmed: 'ยืนยันคำสั่งซื้อ',
    processing: 'กำลังเตรียมสินค้า',
    shipped: 'จัดส่งแล้ว',
    completed: 'สำเร็จ',
    cancelled: 'ยกเลิก',
    expired: 'หมดเวลาชำระเงิน'
  },
  en: {
    eyebrow: 'SYSTEM SETTINGS',
    title: 'Manage members',
    intro: 'Search members and review each member’s orders.',
    members: 'members',
    searchLabel: 'Search members',
    searchPlaceholder: 'Name, email, or phone number',
    search: 'Search',
    clear: 'Clear filters',
    loading: 'Loading members…',
    retry: 'Try again',
    emptyTitle: 'No members found',
    emptyDetail: 'Try a different name, email, or phone number.',
    orders: 'Orders',
    noOrders: 'This member has no orders yet.',
    registered: 'Joined',
    phone: 'Phone',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    orderNumber: 'Order number',
    items: 'items',
    pendingPayment: 'Pending payment',
    pendingReview: 'Receipt review',
    confirmed: 'Confirmed',
    processing: 'Preparing',
    shipped: 'Shipped',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Payment expired'
  }
} as const;

@Component({
  selector: 'ecm-member-management', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './member-management.component.html', styleUrl: './member-management.component.css'
})
export class MemberManagementComponent implements OnInit, OnDestroy {
  private readonly membersApi = inject(MemberManagementService);
  readonly language = inject(MenuLanguageService);
  readonly text = computed(() => copy[this.language.language()]);
  members: SystemMember[] = [];
  search = '';
  selected?: SystemMember;
  page = 1;
  pageCount = 0;
  total = 0;
  loading = false;
  error = '';
  private request?: Subscription;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  load(page = 1): void {
    this.request?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.page = page;
    this.request = this.membersApi.list(page, this.search).pipe(finalize(() => this.loading = false)).subscribe({
      next: response => {
        this.members = response.data;
        this.total = response.meta.pagination.total;
        this.pageCount = response.meta.pagination.pageCount;
        this.selected = this.members.find(member => member.id === this.selected?.id);
      },
      error: error => this.error = error.status === 401 || error.status === 403
        ? 'You do not have permission to access member data.' : 'Unable to load member data.'
    });
  }

  reset(): void {
    this.search = '';
    this.load();
  }

  open(member: SystemMember): void {
    this.selected = this.selected?.id === member.id ? undefined : member;
  }

  memberName(member: SystemMember): string {
    return member.displayName || [member.firstName, member.lastName].filter(Boolean).join(' ') || member.username;
  }

  statusLabel(order: MemberOrder): string {
    const key = order.paymentStatus === 'pending_review' ? 'pendingReview' : ({
      pending_payment: 'pendingPayment', confirmed: 'confirmed', processing: 'processing', shipped: 'shipped',
      completed: 'completed', cancelled: 'cancelled', expired: 'expired'
    } as Record<string, keyof typeof copy.en>)[order.orderStatus];
    return key ? this.text()[key] : order.orderStatus;
  }

  statusClass(order: MemberOrder): string {
    return order.paymentStatus === 'pending_review' ? 'review' : order.orderStatus;
  }

  money(order: MemberOrder): string {
    return new Intl.NumberFormat(this.language.language() === 'th' ? 'th-TH' : 'en-US', {
      style: 'currency', currency: order.currency || 'THB'
    }).format(Number(order.grandTotal));
  }

  track(_: number, member: SystemMember): number {
    return member.id;
  }
}
