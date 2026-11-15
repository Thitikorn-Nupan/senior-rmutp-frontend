import {Component, OnInit} from '@angular/core';
import {NavigationEnd, Router} from "@angular/router";
import {filter} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {User} from "../../../entities/user";
import {JwtResponse} from "../../../entities/register/jwt-response";
import {WebStorageService} from "../../../services/web-storage.service";
import {MenuLanguageService} from "../../../services/menu-language.service";

@Component({
  selector: 'ecm-registers-status',
  templateUrl: './registers-status.component.html',
  styleUrl: './registers-status.component.css'
})
export class RegistersStatusComponent implements OnInit {
  protected declare user: User | null
  protected declare jwtResponse: JwtResponse
  protected isUserLogin : boolean = false
  protected isAdminLogin : boolean = false
  protected isToggle : boolean = false

  constructor(private readonly router: Router,
              private readonly webStorageService: WebStorageService,
              public readonly menuLanguage: MenuLanguageService) {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.loadSession());
  }

  ngOnInit(): void {
    this.loadSession();
  }

  private loadSession(): void {
    this.isUserLogin = false;
    this.isAdminLogin = false;
    this.user = this.webStorageService.getUserFormToken()
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
    if (this.jwtResponse === null) {
      this.jwtResponse = new JwtResponse()
      this.jwtResponse.token = ''
    }
    if (this.user && this.jwtResponse.token !== '') {
      this.isUserLogin = true;
      this.isAdminLogin = this.user.roles === 'ROLE_ADMIN';
    }
  }

  protected logout(): void {
    this.router.navigate(['']).then(() => (this.webStorageService.clearSession()))
  }

  protected toggle(): void {
    this.isToggle = !this.isToggle
  }
}
