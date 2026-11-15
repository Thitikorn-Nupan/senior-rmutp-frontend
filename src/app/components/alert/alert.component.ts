import {Component, HostListener} from '@angular/core';
import {AlertService, AlertStatus} from '../../services/alert.service';
import {MenuLanguageService} from '../../services/menu-language.service';

@Component({
  selector: 'ecm-alert',
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.css',
})
export class AlertComponent {
  readonly icons: Record<AlertStatus, string> = {success: '✓', error: '×', warning: '!', info: 'i'};

  constructor(public readonly alerts: AlertService,
              public readonly language: MenuLanguageService) {
  }

  @HostListener('document:pointerdown')
  @HostListener('document:keydown')
  unlockSound(): void {
    this.alerts.unlockSound();
  }
}
