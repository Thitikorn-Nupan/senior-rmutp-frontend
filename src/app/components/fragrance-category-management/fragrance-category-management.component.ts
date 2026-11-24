import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {firstValueFrom, Subscription} from 'rxjs';
import {AlertService} from '../../services/alert.service';
import {MenuLanguageService} from '../../services/menu-language.service';
import {
  FragranceCategory,
  FragranceCategoryManagementService
} from '../../services/fragrance-category-management.service';

const th = {
  title: 'จัดการประเภทน้ำหอม',
  intro: 'สร้าง แก้ไข และจัดลำดับประเภทน้ำหอมสำหรับหน้าร้าน',
  add: 'เพิ่มประเภท',
  loading: 'กำลังโหลดประเภทน้ำหอม…',
  retry: 'ลองอีกครั้ง',
  empty: 'ยังไม่มีประเภทน้ำหอม',
  active: 'เปิดใช้งาน',
  inactive: 'ปิดใช้งาน',
  perfumes: 'น้ำหอม',
  edit: 'แก้ไข',
  remove: 'ลบ',
  addTitle: 'เพิ่มประเภทน้ำหอม',
  editTitle: 'แก้ไขประเภทน้ำหอม',
  name: 'ชื่อประเภท',
  description: 'คำอธิบาย',
  order: 'ลำดับแสดงผล',
  publish: 'แสดงบนหน้าร้าน',
  cancel: 'ยกเลิก',
  save: 'บันทึก',
  saving: 'กำลังบันทึก…',
  deleteTitle: 'ลบประเภทน้ำหอม?',
  deleteDetail: 'การลบจะทำได้ต่อเมื่อไม่มีน้ำหอมอยู่ในประเภทนี้',
  blocked: 'ยังลบไม่ได้: ย้ายหรือลบน้ำหอมในประเภทนี้ก่อน',
  confirm: 'ลบประเภท',
  deleting: 'กำลังลบ…',
  loadFailed: 'โหลดประเภทน้ำหอมไม่สำเร็จ',
  saveFailed: 'บันทึกประเภทน้ำหอมไม่สำเร็จ',
  deleteFailed: 'ลบประเภทน้ำหอมไม่สำเร็จ',
  created: 'เพิ่มประเภทน้ำหอมแล้ว',
  saved: 'บันทึกประเภทน้ำหอมแล้ว',
  removed: 'ลบประเภทน้ำหอมแล้ว'
};
const en = {
  title: 'Manage fragrance categories',
  intro: 'Create, edit, and order fragrance categories for the storefront.',
  add: 'Add category',
  loading: 'Loading fragrance categories…',
  retry: 'Try again',
  empty: 'No fragrance categories yet',
  active: 'Active',
  inactive: 'Inactive',
  perfumes: 'perfumes',
  edit: 'Edit',
  remove: 'Delete',
  addTitle: 'Add fragrance category',
  editTitle: 'Edit fragrance category',
  name: 'Category name',
  description: 'Description',
  order: 'Display order',
  publish: 'Show on storefront',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving…',
  deleteTitle: 'Delete fragrance category?',
  deleteDetail: 'A category can only be deleted when it contains no perfumes.',
  blocked: 'Cannot delete: move or delete the perfumes in this category first.',
  confirm: 'Delete category',
  deleting: 'Deleting…',
  loadFailed: 'Unable to load fragrance categories',
  saveFailed: 'Unable to save fragrance category',
  deleteFailed: 'Unable to delete fragrance category',
  created: 'Fragrance category created',
  saved: 'Fragrance category saved',
  removed: 'Fragrance category deleted'
};

@Component({
  selector: 'ecm-fragrance-category-management',
  templateUrl: './fragrance-category-management.component.html',
  styleUrl: './fragrance-category-management.component.css'
})
export class FragranceCategoryManagementComponent implements OnInit, OnDestroy {
  categories: FragranceCategory[] = [];
  loading = false;
  failed = false;
  saving = false;
  editor = false;
  editing?: FragranceCategory;
  deleting?: FragranceCategory;
  private request?: Subscription;
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)]
    }),
    description: new FormControl('', {nonNullable: true, validators: [Validators.maxLength(20000)]}),
    sortOrder: new FormControl(0, {nonNullable: true, validators: [Validators.min(0), Validators.max(999999)]}),
    isActive: new FormControl(true, {nonNullable: true})
  });

  constructor(public readonly language: MenuLanguageService, private readonly api: FragranceCategoryManagementService, private readonly alerts: AlertService) {
  }

  get t() {
    return this.language.language() === 'th' ? th : en;
  }

  get assigned() {
    return this.categories.reduce((n, c) => n + c.productCount, 0);
  }

  get active() {
    return this.categories.filter(c => c.isActive).length;
  }

  ngOnInit() {
    this.load();
  }

  ngOnDestroy() {
    this.request?.unsubscribe();
  }

  load() {
    this.request?.unsubscribe();
    this.loading = true;
    this.failed = false;
    this.request = this.api.list().subscribe({
      next: r => {
        this.categories = r.data;
        this.loading = false;
      }, error: () => {
        this.loading = false;
        this.failed = true;
        this.alerts.show({header: this.t.loadFailed, detail: '', status: 'error'});
      }
    });
  }

  open(c?: FragranceCategory) {
    if (this.saving) return;
    this.editing = c;
    this.form.reset({
      name: c?.name ?? '',
      description: c?.description ?? '',
      sortOrder: c?.sortOrder ?? 0,
      isActive: c?.isActive ?? true
    });
    this.editor = true;
  }

  close() {
    if (!this.saving) {
      this.editor = false;
      this.deleting = undefined;
    }
  }

  async save() {
    this.form.markAllAsTouched();
    if (this.saving || this.form.invalid) return;
    this.saving = true;
    const v = this.form.getRawValue();
    try {
      await firstValueFrom(this.api.save(this.editing?.documentId, {
        ...v,
        name: v.name.trim(),
        description: v.description.trim()
      }));
      this.editor = false;
      this.alerts.show({header: this.editing ? this.t.saved : this.t.created, detail: v.name, status: 'success'});
      this.load();
    } catch {
      this.alerts.show({header: this.t.saveFailed, detail: '', status: 'error'});
    } finally {
      this.saving = false;
    }
  }

  ask(c: FragranceCategory) {
    if (!this.saving) this.deleting = c;
  }

  async remove() {
    const c = this.deleting;
    if (!c || this.saving) return;
    if (c.productCount) {
      this.alerts.show({header: this.t.deleteTitle, detail: this.t.blocked, status: 'warning'});
      this.close();
      return;
    }
    this.saving = true;
    try {
      await firstValueFrom(this.api.delete(c.documentId));
      this.deleting = undefined;
      this.alerts.show({header: this.t.removed, detail: c.name, status: 'success'});
      this.load();
    } catch {
      this.alerts.show({header: this.t.deleteFailed, detail: '', status: 'error'});
    } finally {
      this.saving = false;
    }
  }

  track(_: number, c: FragranceCategory) {
    return c.documentId;
  }
}
