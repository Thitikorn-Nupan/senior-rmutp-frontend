import {Component, ElementRef, HostListener, OnInit} from '@angular/core';
import {NavigationEnd, Router} from "@angular/router";
import {filter, merge} from 'rxjs';
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
  protected isUserLogin: boolean = false
  protected isAdminLogin: boolean = false
  protected isToggle: boolean = false
  protected settingsOpen = false;
  protected logoutConfirmationVisible = false;

  constructor(private readonly router: Router,
              private readonly webStorageService: WebStorageService,
              public readonly menuLanguage: MenuLanguageService,
              private readonly element: ElementRef<HTMLElement>) {
    merge(this.router.events.pipe(filter(event => event instanceof NavigationEnd)), this.webStorageService.sessionChanges$)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.settingsOpen = false;
        this.isToggle = false;
        this.loadSession();
      });
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

  protected requestLogout(): void {
    this.settingsOpen = false;
    this.isToggle = false;
    this.logoutConfirmationVisible = true;
  }

  protected cancelLogout(): void {
    this.logoutConfirmationVisible = false;
  }

  protected confirmLogout(): void {
    this.logoutConfirmationVisible = false;
    this.webStorageService.clearSession();
    void this.router.navigate(['/products']);
  }

  protected get logoutConfirmationTitle(): string {
    return this.menuLanguage.language() === 'th' ? 'ยืนยันการออกจากระบบ?' : 'Confirm logout?';
  }

  protected get logoutConfirmationBody(): string {
    return this.menuLanguage.language() === 'th'
      ? 'คุณต้องการออกจากระบบใช่หรือไม่'
      : 'Are you sure you want to log out?';
  }

  protected toggle(): void {
    this.settingsOpen = false;
    this.isToggle = !this.isToggle
  }

  protected toggleSettings(): void {
    this.isToggle = false;
    this.settingsOpen = !this.settingsOpen;
  }

  @HostListener('document:click', ['$event'])
  closeOutside(event: MouseEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) {
      this.settingsOpen = false;
      this.isToggle = false;
    }
  }
}
