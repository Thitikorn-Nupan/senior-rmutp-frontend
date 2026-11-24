import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {Subscription, finalize, firstValueFrom, forkJoin, map, timer} from 'rxjs';
import {SalesHistoryService, SalesOrder} from '../../services/sales-history.service';
import {environment} from '../../../environments/environment';
import {AlertService} from '../../services/alert.service';
import {MenuLanguageService} from '../../services/menu-language.service';

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
  protected readonly loadingRows = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  protected error = '';
  protected approving = '';
  protected receiptLoading = '';
  protected receiptViewLoading = false;
  protected receiptViewError = '';
  protected receiptPreviewUrl = '';
  protected receiptOrder?: SalesOrder;
  protected selected?: SalesOrder;
  protected approvalOrder?: SalesOrder;
  protected approvalConfirmationVisible = false;
  protected documentsOpen = false;
  protected documentsLoading = false;
  protected documentExporting: 'pdf' | 'excel' | '' = '';
  protected previewPage = 0;
  protected previewPages: SalesOrder[][] = [];
  private documentOrders: SalesOrder[] = [];
  protected readonly reportDate = new Date();
  private request?: Subscription;
  private receiptRequest?: Subscription;
  private readonly minimumLoadingMs = 500;

  protected readonly statusOptions = [
    {name: 'ทุกสถานะ', value: ''}, {name: 'รอตรวจสอบสลิป', value: 'pending_review'},
    {name: 'รอชำระเงิน', value: 'pending_payment'}, {name: 'ยืนยันคำสั่งซื้อ', value: 'confirmed'},
    {name: 'กำลังเตรียมสินค้า', value: 'processing'}, {name: 'จัดส่งแล้ว', value: 'shipped'},
    {name: 'สำเร็จ', value: 'completed'}, {name: 'ยกเลิก', value: 'cancelled'}
  ] as const;

  constructor(private readonly sales: SalesHistoryService,
              private readonly alerts: AlertService,
              protected readonly language: MenuLanguageService) {
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
    this.request = forkJoin([
      this.sales.list(page, this.search, this.status),
      timer(this.minimumLoadingMs)
    ]).pipe(
      map(([response]) => response),
      finalize(() => this.loading = false)
    ).subscribe({
      next: response => {
        this.orders = response.data;
        this.total = response.meta.pagination.total;
        this.pageCount = response.meta.pagination.pageCount;
        this.summary = response.summary;
        this.documentOrders = [];
        this.previewPages = [];
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

  protected openDocuments(): void {
    this.documentsOpen = true;
    this.previewPage = 0;
    void this.loadDocumentPreview();
  }

  protected closeDocuments(): void {
    this.documentsOpen = false;
  }

  protected previousPreviewPage(): void {
    if (this.previewPage > 0) this.previewPage--;
  }

  protected nextPreviewPage(): void {
    if (this.previewPage < this.previewPages.length - 1) this.previewPage++;
  }

  protected get currentPreviewOrders(): SalesOrder[] {
    return this.previewPages[this.previewPage] || [];
  }

  private async loadDocumentPreview(): Promise<void> {
    this.documentsLoading = true;
    try {
      this.documentOrders = await this.reportOrders();
      this.previewPages = this.paginateDocumentOrders(this.documentOrders);
      this.previewPage = 0;
    } catch {
      this.previewPages = [];
      this.error = 'ไม่สามารถโหลดข้อมูลสำหรับแสดงตัวอย่างเอกสารได้';
    } finally {
      this.documentsLoading = false;
    }
  }

  protected async downloadPdf(): Promise<void> {
    if (this.documentExporting) return;
    this.documentExporting = 'pdf';
    try {
      const {jsPDF} = await import('jspdf');
      const orders = await this.reportOrders();
      const [font, logo] = await Promise.all([this.assetAsBase64('assets/fonts/Mitr-Medium.ttf'), this.assetAsBase64('logo.png')]);
      const pdf = new jsPDF({orientation: 'landscape', unit: 'mm', format: 'a4', compress: true});
      pdf.setDocumentProperties({title: 'รายงานประวัติการขาย', author: 'Perfumes Shop'});
      pdf.setLanguage('th');
      if (font) {
        pdf.addFileToVFS('Mitr-Medium.ttf', font);
        pdf.addFont('Mitr-Medium.ttf', 'Mitr', 'normal', 400, 'Identity-H');
        pdf.setFont('Mitr');
      }

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const left = 10;
      const columns = [8, 26, 28, 42, 25, 48, 28, 29, 30];
      const headings = ['#', 'เลขที่คำสั่งซื้อ', 'วันที่สั่งซื้อ', 'ลูกค้า', 'โทรศัพท์', 'สินค้า', 'ชำระเงิน', 'สถานะ', 'ยอดรวม'];
      let y = 0;
      const addHeader = (includeTableHeader: boolean): void => {
        pdf.setFillColor(23, 63, 54);
        pdf.rect(0, 0, pageWidth, 29, 'F');
        if (logo) pdf.addImage(logo, 'PNG', left, 6, 16, 16);
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(15);
        pdf.text('PERFUMES SHOP', logo ? 30 : left, 13);
        pdf.setFontSize(10);
        pdf.text('รายงานประวัติการขาย', logo ? 30 : left, 20);
        pdf.setFontSize(8);
        pdf.text(`จัดทำเมื่อ ${this.reportDateText()}`, pageWidth - left, 13, {align: 'right'});
        pdf.text(`จำนวน ${orders.length} คำสั่งซื้อ`, pageWidth - left, 20, {align: 'right'});
        const summaryGap = 2;
        const summaryWidth = (pageWidth - left * 2 - summaryGap * 2) / 3;
        const summaryY = 34;
        const summaries = [
          {label: 'รายการขายทั้งหมด', value: String(this.total)},
          {label: 'ยอดบิลทั้งหมด', value: this.formatMoney(this.summary.billTotal)},
          {label: 'รายได้ที่ยืนยันแล้ว', value: this.formatMoney(this.summary.verifiedRevenue)}
        ];
        summaries.forEach((summary, index) => {
          const x = left + index * (summaryWidth + summaryGap);
          pdf.setFillColor(246, 250, 247);
          pdf.roundedRect(x, summaryY, summaryWidth, 15, 1.5, 1.5, 'F');
          pdf.setTextColor(102, 123, 112);
          pdf.setFontSize(6.5);
          pdf.text(summary.label, x + 3, summaryY + 5);
          pdf.setTextColor(36, 76, 63);
          pdf.setFontSize(10);
          pdf.text(summary.value, x + 3, summaryY + 11.5);
        });
        y = summaryY + 19;
        if (!includeTableHeader) return;
        let x = left;
        pdf.setFillColor(231, 240, 235);
        pdf.rect(left, y, columns.reduce((sum, width) => sum + width, 0), 10, 'F');
        pdf.setTextColor(35, 69, 58);
        pdf.setFontSize(7);
        headings.forEach((heading, index) => {
          pdf.text(heading, x + 1.5, y + 6.2);
          x += columns[index];
        });
        y += 10;
      };
      const addFooter = (page: number, pages: number): void => {
        pdf.setDrawColor(209, 220, 214);
        pdf.line(left, pageHeight - 11, pageWidth - left, pageHeight - 11);
        pdf.setTextColor(103, 121, 111);
        pdf.setFontSize(7);
        pdf.text('เอกสารสำหรับใช้ภายในร้านค้า', left, pageHeight - 6);
        pdf.text(`หน้า ${page} / ${pages}`, pageWidth - left, pageHeight - 6, {align: 'right'});
      };
      const cellLines = (text: string, width: number): string[] => pdf.splitTextToSize(text || '—', width - 3) as string[];
      this.paginateDocumentOrders(orders).forEach((pageOrders, pageIndex) => {
        if (pageIndex) pdf.addPage();
        addHeader(true);
        pageOrders.forEach((order, rowIndex) => {
          const itemText = order.items.map(item => `${item.name} x${item.quantity}`).join('\n');
          const values = [
            String(pageIndex * 6 + rowIndex + 1), order.orderNumber, this.dateText(order.placedAt), order.customerName,
            order.customerPhone || '—', itemText || '—', this.paymentText(order), this.statusLabel(order), this.formatMoney(order.grandTotal, order.currency)
          ];
          const lines = values.map((value, column) => cellLines(value, columns[column]));
          const rowHeight = Math.max(10, ...lines.map(line => line.length * 4.2 + 3));
          let x = left;
          pdf.setDrawColor(222, 230, 224);
          pdf.setFillColor((pageIndex * 6 + rowIndex) % 2 ? 250 : 255, (pageIndex * 6 + rowIndex) % 2 ? 252 : 255, (pageIndex * 6 + rowIndex) % 2 ? 250 : 255);
          pdf.rect(left, y, columns.reduce((sum, width) => sum + width, 0), rowHeight, 'FD');
          pdf.setTextColor(38, 57, 48);
          pdf.setFontSize(6.7);
          lines.forEach((line, column) => {
            pdf.text(line, x + 1.5, y + 5, {lineHeightFactor: 1.15});
            if (column < columns.length - 1) pdf.line(x + columns[column], y, x + columns[column], y + rowHeight);
            x += columns[column];
          });
          y += rowHeight;
        });
      });
      const pages = pdf.getNumberOfPages();
      for (let page = 1; page <= pages; page++) {
        pdf.setPage(page);
        addFooter(page, pages);
      }
      pdf.save(`sales-report-${this.fileDate()}.pdf`);
    } catch {
      this.error = 'ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองอีกครั้ง';
    } finally {
      this.documentExporting = '';
    }
  }

  protected async downloadExcel(): Promise<void> {
    if (this.documentExporting) return;
    this.documentExporting = 'excel';
    try {
      const XLSX = await import('xlsx');
      const orders = await this.reportOrders();
      const rows = orders.flatMap(order => (order.items.length ? order.items : [{
        name: '—',
        sku: '—',
        quantity: 0,
        unitPrice: '0',
        lineTotal: '0'
      }]).map(item => ({
        'เลขที่คำสั่งซื้อ': order.orderNumber,
        'วันที่สั่งซื้อ': this.dateText(order.placedAt),
        'สถานะคำสั่งซื้อ': this.statusLabel(order),
        'สถานะชำระเงิน': this.paymentText(order),
        'ชื่อลูกค้า': order.customerName,
        'อีเมล': order.customerEmail,
        'โทรศัพท์': order.customerPhone || '—',
        'สินค้า': item.name,
        'รหัสสินค้า': item.sku,
        'จำนวน': item.quantity,
        'ราคาต่อหน่วย': Number(item.unitPrice),
        'ยอดสินค้า': Number(item.lineTotal),
        'ยอดรวมคำสั่งซื้อ': Number(order.grandTotal),
        'สกุลเงิน': order.currency || 'THB',
        'เลขอ้างอิงชำระเงิน': order.payment?.reference || '—'
      })));
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet['!cols'] = [16, 20, 18, 22, 24, 30, 18, 34, 16, 10, 15, 15, 18, 12, 25].map(width => ({wch: width}));
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      sheet['!autofilter'] = {ref: XLSX.utils.encode_range(range)};
      for (let column = 0; column <= range.e.c; column++) {
        const header = sheet[XLSX.utils.encode_cell({r: 0, c: column})];
        if (header) header.s = {
          font: {bold: true},
          fill: {fgColor: {rgb: '173F36'}},
          alignment: {horizontal: 'center'}
        };
      }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'รายงานการขาย');
      XLSX.writeFile(workbook, `sales-report-${this.fileDate()}.xlsx`, {compression: true});
    } catch {
      this.error = 'ไม่สามารถสร้างไฟล์ Excel ได้ กรุณาลองอีกครั้ง';
    } finally {
      this.documentExporting = '';
    }
  }

  private async reportOrders(): Promise<SalesOrder[]> {
    if (this.documentOrders.length) return this.documentOrders;
    if (!this.pageCount) return this.orders;
    const pages = await Promise.all(Array.from({length: this.pageCount}, (_, index) => firstValueFrom(this.sales.list(index + 1, this.search, this.status))));
    return pages.flatMap(response => response.data);
  }

  private paginateDocumentOrders(orders: SalesOrder[]): SalesOrder[][] {
    const rowsPerPage = 6;
    if (!orders.length) return [[]];
    return Array.from({length: Math.ceil(orders.length / rowsPerPage)}, (_, index) => orders.slice(index * rowsPerPage, (index + 1) * rowsPerPage));
  }

  private async assetAsBase64(path: string): Promise<string> {
    const response = await fetch(new URL(path, document.baseURI).href);
    if (!response.ok) throw new Error(`Unable to load ${path}`);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
  }

  private paymentText(order: SalesOrder): string {
    const status = order.payment?.status || order.paymentStatus || '—';
    return order.payment?.reference ? `${status} (${order.payment.reference})` : status;
  }

  private dateText(value: string): string {
    return new Intl.DateTimeFormat('th-TH', {dateStyle: 'short', timeStyle: 'short'}).format(new Date(value));
  }

  private formatMoney(value: string, currency = this.summary.currency): string {
    return new Intl.NumberFormat('th-TH', {style: 'currency', currency: currency || 'THB'}).format(Number(value));
  }

  private fileDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private reportDateText(): string {
    return new Intl.DateTimeFormat('th-TH', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date());
  }

  protected getPageNumbers(): number[] {
    return Array.from({length: this.pageCount}, (_, index) => index + 1);
  }

  protected changePage(page: number): void {
    if (page < 1 || page > this.pageCount || page === this.page) return;
    this.load(page);
  }

  protected open(order: SalesOrder): void {
    this.selected = this.selected?.documentId === order.documentId ? undefined : order;
  }

  protected requestApproval(order: SalesOrder): void {
    if (this.approving) return;
    this.approvalOrder = order;
    this.approvalConfirmationVisible = true;
  }

  protected cancelApproval(): void {
    this.approvalConfirmationVisible = false;
    this.approvalOrder = undefined;
  }

  protected confirmApproval(): void {
    const order = this.approvalOrder;
    if (!order || this.approving) return;
    this.cancelApproval();
    this.approving = order.documentId;
    this.sales.approve(order.documentId).pipe(finalize(() => this.approving = '')).subscribe({
      next: () => {
        const thai = this.language.language() === 'th';
        this.alerts.show({
          header: thai ? 'ยืนยันการชำระเงินสำเร็จ' : 'Payment confirmed',
          detail: thai ? `คำสั่งซื้อ ${order.orderNumber} ได้รับการยืนยันแล้ว` : `Order ${order.orderNumber} has been confirmed.`,
          status: 'success'
        });
        this.load(this.page);
      },
      error: error => this.error = error.error?.error?.message || 'Unable to confirm payment.'
    });
  }

  protected get approvalConfirmationTitle(): string {
    return this.language.language() === 'th' ? 'ยืนยันการชำระเงิน?' : 'Confirm payment?';
  }

  protected get approvalConfirmationBody(): string {
    if (!this.approvalOrder) return '';
    return this.language.language() === 'th'
      ? `คุณต้องการยืนยันการชำระเงินของ ${this.approvalOrder.orderNumber} ใช่หรือไม่`
      : `Are you sure you want to confirm payment for ${this.approvalOrder.orderNumber}?`;
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
    if (this.documentsOpen) this.closeDocuments();
    else if (this.receiptOrder) this.closeReceipt();
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
