import {Component, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {MenuLanguageService} from '../../services/menu-language.service';

@Component({
  selector: 'pop-up',
  templateUrl: './pop-up.component.html',
  styleUrl: './pop-up.component.css'
})
export class PopUpComponent {

  @Input()
  public visible : boolean = false;
  @Input()
  public headerTitle! : string;
  @Input()
  public body! : string;
  @Input()
  public iconMode! : 'WARN' | 'ERROR' | 'CONFIRM' | 'SUCCESS';
  @Output()
  public okEvent: EventEmitter<any> = new EventEmitter();
  @Output()
  public closeEvent: EventEmitter<any> = new EventEmitter();

  constructor(public readonly language: MenuLanguageService) {}

  protected get labels(): { cancel: string; confirm: string; close: string } {
    return this.language.language() === 'th'
      ? {cancel: 'ยกเลิก', confirm: 'ยืนยัน', close: 'ปิดหน้าต่าง'}
      : {cancel: 'Cancel', confirm: 'Confirm', close: 'Close dialog'};
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.visible) this.getCloseEvent();
  }

  protected getOkEvent(): void {
    this.okEvent.emit()
  }

  protected getCloseEvent(): void {
    this.closeEvent.emit()
  }
}
