import { Component } from '@angular/core';

@Component({
  selector: 'ecm-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
}
