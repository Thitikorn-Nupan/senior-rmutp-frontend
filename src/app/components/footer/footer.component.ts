import {Component} from '@angular/core';
import {MenuLanguageService} from '../../services/menu-language.service';

@Component({
  selector: 'ecm-footer',
  host: {'[attr.lang]': 'menuLanguage.language()'},
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  readonly currentYear : number = new Date().getFullYear();
  constructor(public readonly menuLanguage: MenuLanguageService) {}
}
