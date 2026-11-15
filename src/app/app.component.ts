import {Component} from '@angular/core';
import {SessionExpiryService} from './services/session-expiry.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(sessions: SessionExpiryService) {
    sessions.start();
  }
}
