import {CommonModule} from '@angular/common';
import {Component, ElementRef, EventEmitter, forwardRef, HostListener, Input, OnChanges, OnDestroy, Output, ViewChild} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

@Component({
  selector: 'ecm-checkout-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-select.component.html',
  styleUrl: './checkout-select.component.css',
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CheckoutSelectComponent), multi: true}]
})
export class CheckoutSelectComponent implements ControlValueAccessor, OnChanges, OnDestroy {
  @Input({required: true}) inputId = '';
  @Input() options: readonly {name: string}[] = [];
  @Input() placeholder = 'Select an option';
  @Input() unavailable = false;
  @Input() invalid = false;
  @Input() describedBy: string | null = null;
  @Input() required = true;
  @Output() selectionChange = new EventEmitter<string>();

  protected value: string | null = null;
  protected open = false;
  protected above = false;
  protected activeIndex = 0;
  private disabled = false;
  private typeahead = '';
  private typeaheadTimer?: ReturnType<typeof setTimeout>;
  private listbox?: ElementRef<HTMLElement>;
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  @ViewChild('listbox') set listboxRef(element: ElementRef<HTMLElement> | undefined) {
    this.listbox = element;
    this.scrollActiveIntoView();
  }

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  protected get isDisabled(): boolean { return this.disabled || this.unavailable || !this.options.length; }

  writeValue(value: string | null): void {
    this.value = value;
    this.open = false;
  }
  registerOnChange(fn: (value: string | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) this.close();
  }
  ngOnChanges(): void {
    if (this.isDisabled) this.close();
    this.activeIndex = Math.max(0, this.options.findIndex(option => option.name === this.value));
  }

  protected toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  private show(): void {
    if (this.isDisabled) return;
    const rect = this.host.nativeElement.getBoundingClientRect();
    const height = Math.min(this.options.length * 46 + 16, 248);
    this.above = window.innerHeight - rect.bottom < height && rect.top > height;
    this.activeIndex = Math.max(0, this.options.findIndex(option => option.name === this.value));
    this.open = true;
  }

  protected choose(index: number): void {
    const option = this.options[index];
    if (!option || this.isDisabled) return;
    const changed = option.name !== this.value;
    this.value = option.name;
    if (changed) this.onChange(option.name);
    this.close();
    if (changed) {
      this.selectionChange.emit(option.name);
    }
  }

  protected close(): void {
    if (this.open) this.onTouched();
    this.open = false;
    this.typeahead = '';
    clearTimeout(this.typeaheadTimer);
  }

  protected blur(): void { this.close(); this.onTouched(); }

  @HostListener('document:pointerdown', ['$event'])
  outsideClick(event: PointerEvent): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  protected keydown(event: KeyboardEvent): void {
    if (this.isDisabled || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Tab') { this.close(); return; }
    if (event.key === 'Escape') {
      if (this.open) { event.preventDefault(); event.stopPropagation(); this.close(); }
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (this.open) this.choose(this.activeIndex);
      else this.show();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!this.open) this.show();
      else if (event.key === 'ArrowDown') this.activeIndex = Math.min(this.activeIndex + 1, this.options.length - 1);
      else if (event.key === 'ArrowUp') this.activeIndex = Math.max(this.activeIndex - 1, 0);
      if (event.key === 'Home') this.activeIndex = 0;
      if (event.key === 'End') this.activeIndex = this.options.length - 1;
      this.scrollActiveIntoView();
      return;
    }
    if (event.key.length === 1) {
      event.preventDefault();
      if (!this.open) this.show();
      clearTimeout(this.typeaheadTimer);
      this.typeahead += event.key.toLocaleLowerCase();
      let index = this.options.findIndex(option => option.name.toLocaleLowerCase().startsWith(this.typeahead));
      if (index < 0) {
        this.typeahead = event.key.toLocaleLowerCase();
        index = this.options.findIndex(option => option.name.toLocaleLowerCase().startsWith(this.typeahead));
      }
      if (index >= 0) this.activeIndex = index;
      this.scrollActiveIntoView();
      this.typeaheadTimer = setTimeout(() => { this.typeahead = ''; }, 600);
    }
  }

  private scrollActiveIntoView(): void {
    const option = this.listbox?.nativeElement.children.item(this.activeIndex) as HTMLElement | null;
    option?.scrollIntoView({block: 'nearest'});
  }

  ngOnDestroy(): void { this.open = false; clearTimeout(this.typeaheadTimer); }
}
