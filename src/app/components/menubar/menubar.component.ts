import {AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {JwtResponse} from "../../entities/register/jwt-response";
import {User} from "../../entities/user";
import {WebStorageService} from "../../services/web-storage.service";
import {UsefulFunctionService} from "../../services/useful-function.service";
import {MenuLanguageService} from "../../services/menu-language.service";
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
  selector: 'ecm-menubar',
  templateUrl: './menubar.component.html',
  styleUrls: ['./menubar.component.css', './menubar-mobile.css']
})
export class MenubarComponent implements OnInit, OnDestroy, AfterViewChecked {
  mobileMenuOpen = false;
  @ViewChild('mobileNavigation') private mobileNavigation?: ElementRef<HTMLElement>;
  @ViewChild('menuToggle') private menuToggle?: ElementRef<HTMLButtonElement>;
  private previousOverflow?: string;
  private focusMenu = false;

  protected declare user: User | null
  protected declare jwtResponse: JwtResponse
  protected declare tokenExpire: number | null
  protected readonly UsefulFunctionService = UsefulFunctionService;

  constructor(private readonly webStorageService: WebStorageService,
              public readonly menuLanguage: MenuLanguageService,
              router: Router) {
    router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.loadSession();
        this.closeMobileMenu();
      });
  }

  ngOnInit(): void {
    this.loadSession();
  }

  toggleMobileMenu(): void {
    if (this.mobileMenuOpen) {
      this.closeMobileMenu();
      return;
    }
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.mobileMenuOpen = true;
    this.focusMenu = true;
  }

  closeMobileMenu(restoreFocus = true): void {
    if (!this.mobileMenuOpen) return;
    this.mobileMenuOpen = false;
    this.focusMenu = false;
    this.restoreScroll();
    if (restoreFocus) this.menuToggle?.nativeElement.focus();
  }

  onMenuClick(event: MouseEvent): void {
    if ((event.target as Element).closest('a')) this.closeMobileMenu();
  }

  ngAfterViewChecked(): void {
    if (this.focusMenu && this.mobileNavigation) {
      this.mobileNavigation.nativeElement.querySelector<HTMLElement>('[data-menu-autofocus]')?.focus();
      this.focusMenu = false;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!window.matchMedia('(max-width: 768px)').matches) this.closeMobileMenu(false);
  }

  @HostListener('document:keydown', ['$event'])
  onMenuKeydown(event: KeyboardEvent): void {
    if (!this.mobileMenuOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMobileMenu();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(this.mobileNavigation?.nativeElement.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? []);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    } else if (!this.mobileNavigation?.nativeElement.contains(document.activeElement)) {
      event.preventDefault();
      first?.focus();
    }
  }

  private restoreScroll(): void {
    if (this.previousOverflow !== undefined) document.body.style.overflow = this.previousOverflow;
    this.previousOverflow = undefined;
  }

  ngOnDestroy(): void {
    this.restoreScroll();
  }

  private loadSession(): void {
    this.user = this.webStorageService.getUserFormToken()
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
    this.tokenExpire = this.webStorageService.getTokenExpiry();
    if (this.jwtResponse === null) {
      this.jwtResponse = new JwtResponse()
      this.jwtResponse.token = ''
    }
  }

}
