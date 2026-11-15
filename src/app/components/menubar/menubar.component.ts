import {
  AfterViewChecked,
  Component,
  computed,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {JwtResponse} from "../../entities/register/jwt-response";
import {User} from "../../entities/user";
import {WebStorageService} from "../../services/web-storage.service";
import {UsefulFunctionService} from "../../services/useful-function.service";
import {MenuLanguageService} from "../../services/menu-language.service";
import {NavigationEnd, Router} from '@angular/router';
import {catchError, filter, merge, of, Subject, switchMap} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ProfileService} from '../../services/profile.service';

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
  private readonly profileRefresh = new Subject<void>();
  protected failedAvatarUrl = '';
  protected readonly profileAvatar = computed(() => this.profiles.avatarUrl(this.profiles.profile()?.avatar ?? null));
  protected readonly profileName = computed(() => {
    const profile = this.profiles.profile();
    return profile?.displayName.trim() || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
  });

  protected declare user: User | null
  protected declare jwtResponse: JwtResponse
  protected declare tokenExpire: number | null
  protected readonly UsefulFunctionService = UsefulFunctionService;

  constructor(private readonly webStorageService: WebStorageService,
              public readonly menuLanguage: MenuLanguageService,
              protected readonly profiles: ProfileService,
              router: Router) {
    this.profileRefresh.pipe(
      switchMap(() => this.user ? this.profiles.get().pipe(catchError(() => of(null))) : of(null)),
      takeUntilDestroyed(),
    ).subscribe();
    merge(router.events.pipe(filter(event => event instanceof NavigationEnd)), this.webStorageService.sessionChanges$)
      .pipe(takeUntilDestroyed())
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
    const previousUser = this.user?.uid;
    this.user = this.webStorageService.getUserFormToken()
    if (!this.user || this.user.uid !== previousUser) this.profiles.clear();
    this.profileRefresh.next();
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
    this.tokenExpire = this.webStorageService.getTokenExpiry();
    if (this.jwtResponse === null) {
      this.jwtResponse = new JwtResponse()
      this.jwtResponse.token = ''
    }
  }

}
