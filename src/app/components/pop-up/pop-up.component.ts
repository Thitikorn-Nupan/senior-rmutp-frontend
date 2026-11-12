import {Component, EventEmitter, Input, Output} from '@angular/core';

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

  constructor() {}

  protected getOkEvent() {
    this.okEvent.emit()
  }

  protected getCloseEvent() {
    this.closeEvent.emit()
  }
}
