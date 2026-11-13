import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {CheckoutSelectComponent} from './checkout-select.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CheckoutSelectComponent],
  template: `<form (submit)="submits = submits + 1; $event.preventDefault()">
    <label for="test-province">Province</label>
    <ecm-checkout-select inputId="test-province" [formControl]="control" [options]="options"
      placeholder="Select province" [unavailable]="unavailable" (selectionChange)="selected = $event" />
    <button type="button" id="outside">Outside</button>
  </form>`
})
class SelectHost {
  control = new FormControl<string | null>('Bangkok');
  options = ['Bangkok', 'Nonthaburi', 'Samut Sakhon', 'Chonburi'].map(name => ({name}));
  unavailable = false;
  selected = '';
  submits = 0;
}

describe('Checkout address dropdown', () => {
  let fixture: ComponentFixture<SelectHost>;
  let host: SelectHost;
  const trigger = () => fixture.nativeElement.querySelector('[role="combobox"]') as HTMLButtonElement;
  const options = () => fixture.nativeElement.querySelectorAll('[role="option"]') as NodeListOf<HTMLElement>;
  const key = (value: string) => {
    trigger().dispatchEvent(new KeyboardEvent('keydown', {key: value, bubbles: true, cancelable: true}));
    fixture.detectChanges();
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [SelectHost]}).compileComponents();
    fixture = TestBed.createComponent(SelectHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('writes a pointer selection into the reactive form before notifying the parent', () => {
    trigger().click();
    fixture.detectChanges();
    options()[1].click();
    fixture.detectChanges();
    expect(host.control.value).toBe('Nonthaburi');
    expect(host.selected).toBe('Nonthaburi');
    expect(host.control.touched).toBeTrue();
    expect(options().length).toBe(0);
  });

  it('supports arrow navigation and Enter without submitting the checkout form', () => {
    key('ArrowDown');
    key('ArrowDown');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(options()[1].id);
    key('Enter');
    expect(host.control.value).toBe('Nonthaburi');
    expect(host.submits).toBe(0);
  });

  it('commits selections for controls configured to update on blur', () => {
    host.control = new FormControl<string | null>('Bangkok', {updateOn: 'blur'});
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    options()[1].click();
    fixture.detectChanges();
    expect(host.control.value).toBe('Nonthaburi');
    expect(host.selected).toBe('Nonthaburi');
  });

  it('supports Home, End and Space to select the final option', () => {
    key('Home');
    key('End');
    key(' ');
    expect(host.control.value).toBe('Chonburi');
  });

  it('uses typed letters to locate an option', () => {
    key('s');
    key('Enter');
    expect(host.control.value).toBe('Samut Sakhon');
  });

  it('cancels a pending choice with Escape or Tab', () => {
    key('End');
    key('Escape');
    expect(host.control.value).toBe('Bangkok');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    key('End');
    key('Tab');
    expect(options().length).toBe(0);
    expect(host.control.value).toBe('Bangkok');
  });

  it('closes when clicking outside and marks the field touched on blur', () => {
    trigger().click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('#outside').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
    fixture.detectChanges();
    expect(options().length).toBe(0);
    trigger().dispatchEvent(new FocusEvent('blur'));
    expect(host.control.touched).toBeTrue();
  });

  it('reflects copied form values and resets without emitting a user selection', () => {
    host.control.setValue('Chonburi');
    fixture.detectChanges();
    expect(trigger().textContent).toContain('Chonburi');
    trigger().click();
    fixture.detectChanges();
    host.control.reset();
    fixture.detectChanges();
    expect(trigger().textContent).toContain('Select province');
    expect(options().length).toBe(0);
    expect(host.selected).toBe('');
  });

  it('prevents interaction while loading, when disabled, or when options are empty', () => {
    host.unavailable = true;
    fixture.detectChanges();
    expect(trigger().disabled).toBeTrue();
    host.unavailable = false;
    host.control.disable();
    fixture.detectChanges();
    expect(trigger().disabled).toBeTrue();
    host.control.enable();
    host.options = [];
    fixture.detectChanges();
    expect(trigger().disabled).toBeTrue();
    trigger().click();
    fixture.detectChanges();
    expect(options().length).toBe(0);
  });

  it('replaces district options when the province changes', () => {
    host.options = [{name: 'Dusit'}, {name: 'Bang Rak'}];
    host.control.setValue('Dusit');
    fixture.detectChanges();
    key('Enter');
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    host.options = [{name: 'Na Di'}];
    host.control.setValue('Na Di');
    fixture.detectChanges();
    key('Enter');
    expect(options().length).toBe(1);
    expect(options()[0].textContent).toContain('Na Di');
    expect(trigger().textContent).toContain('Na Di');
  });
});
