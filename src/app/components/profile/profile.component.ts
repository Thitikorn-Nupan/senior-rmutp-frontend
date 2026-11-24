import {Component, computed, DestroyRef, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ProfileService, UserProfile} from '../../services/profile.service';
import {MenuLanguageService} from '../../services/menu-language.service';
import {profileText} from './profile-text';
import {AlertService} from '../../services/alert.service';

@Component({
  selector: 'ecm-profile', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html', styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(ProfileService);
  private readonly alerts = inject(AlertService);
  private readonly destroyRef = inject(DestroyRef);
  readonly language = inject(MenuLanguageService);
  readonly text = computed(() => profileText[this.language.language()]);
  profile?: UserProfile;
  avatarUrl = '';
  loading = false;
  saving = false;
  uploading = false;
  loadError = false;
  error = '';
  readonly personalFields = [
    {key: 'firstName', autocomplete: 'given-name', max: 90, required: true},
    {key: 'lastName', autocomplete: 'family-name', max: 90, required: true},
    {key: 'displayName', autocomplete: 'nickname', max: 90, required: false},
    {key: 'phone', autocomplete: 'tel', max: 30, required: false},
  ] as const;
  readonly addressFields = [
    {key: 'addressLine1', autocomplete: 'address-line1', max: 255},
    {key: 'addressLine2', autocomplete: 'address-line2', max: 255},
    {key: 'subdistrict', autocomplete: 'address-level3', max: 100},
    {key: 'district', autocomplete: 'address-level2', max: 100},
    {key: 'province', autocomplete: 'address-level1', max: 100},
    {key: 'postalCode', autocomplete: 'postal-code', max: 5},
  ] as const;
  readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(90)]],
    lastName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(90)]],
    displayName: ['', Validators.maxLength(90)],
    phone: ['', [Validators.pattern(/^[+\d() .-]{6,30}$/), Validators.maxLength(30)]],
    shippingAddress: this.fb.group({
      addressLine1: ['', Validators.maxLength(255)],
      addressLine2: ['', Validators.maxLength(255)],
      subdistrict: ['', Validators.maxLength(100)],
      district: ['', Validators.maxLength(100)],
      province: ['', Validators.maxLength(100)],
      postalCode: ['', Validators.pattern(/^\d{5}$/)],
      countryCode: ['TH'],
    }),
  });

  ngOnInit(): void {
    this.load();
  }

  invalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control?.invalid && !!control.touched;
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.error = '';
    this.api.get().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading = false)).subscribe({
      next: ({data}) => {
        this.profile = data;
        this.avatarUrl = this.api.avatarUrl(data.avatar);
        this.fill(data);
      },
      error: error => {
        this.loadError = true;
        this.handleError(error, this.text().loadError);
      },
    });
  }

  private fill(data: UserProfile): void {
    const shippingAddress = data.shippingAddress ?? {
      addressLine1: '',
      addressLine2: '',
      subdistrict: '',
      district: '',
      province: '',
      postalCode: '',
      countryCode: 'TH'
    };
    this.form.reset({
      firstName: data.firstName, lastName: data.lastName, displayName: data.displayName, phone: data.phone,
      shippingAddress: {...shippingAddress, countryCode: 'TH'}
    });
  }

  save(): void {
    if (this.saving || this.uploading || this.loading) return;
    this.error = '';
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.alerts.show({header: this.text().title, detail: this.text().invalid, status: 'warning'});
      return;
    }
    this.saving = true;
    this.api.save(this.form.getRawValue()).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving = false)).subscribe({
      next: ({data}) => {
        this.profile = data;
        this.fill(data);
        this.alerts.show({header: this.text().title, detail: this.text().saved, status: 'success'});
      },
      error: error => this.handleError(error, this.text().saveError, this.text().title),
    });
  }

  choosePhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.saving || this.uploading) return;
    this.error = '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024) {
      this.alerts.show({header: this.text().photo, detail: this.text().invalidPhoto, status: 'warning'});
      return;
    }
    this.uploading = true;
    this.api.upload(file).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.uploading = false)).subscribe({
      next: ({data}) => this.photoUpdated(data),
      error: error => this.handleError(error, this.text().photoError, this.text().photo),
    });
  }

  removePhoto(): void {
    if (this.uploading || this.saving) return;
    this.uploading = true;
    this.error = '';
    this.api.removeAvatar().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.uploading = false)).subscribe({
      next: ({data}) => this.photoUpdated(data),
      error: error => this.handleError(error, this.text().photoError, this.text().photo),
    });
  }

  private photoUpdated(data: UserProfile): void {
    this.profile = data;
    this.avatarUrl = this.api.avatarUrl(data.avatar);
    this.alerts.show({header: this.text().photo, detail: this.text().photoSaved, status: 'success'});
  }

  private handleError(_error: { status?: number }, fallback: string, header?: string): void {
    if (header) this.alerts.show({header, detail: fallback, status: 'error'});
    else this.error = fallback;
  }
}
