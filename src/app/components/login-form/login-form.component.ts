import {Component, OnInit} from '@angular/core';
import {UserRegisterService} from "../../services/user-register.service";
import {Login} from "../../entities/register/login";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {WebStorageService} from "../../services/web-storage.service";
import {ActivatedRoute, Router} from "@angular/router";
import {JwtResponse} from "../../entities/security/jwt-response";
import {AlertService} from '../../services/alert.service';
import {MenuLanguageService} from '../../services/menu-language.service';
import {authErrorMessage} from '../../services/auth-error-message';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['../auth-form.css', './login-form.component.css']
})
export class LoginFormComponent implements OnInit {
  protected showPassword = false;

  protected declare form: FormGroup;
  protected declare loginRequest: Login

  // Legacy popup bindings retained while its template is commented out.
  protected iconMode: 'WARN' | 'ERROR' = 'WARN';
  public visible: boolean = false;
  protected headerTitle: string = 'Login Failed';
  protected declare body: string;


  constructor(private readonly userRegisterService: UserRegisterService,
              private readonly webStorageService: WebStorageService,
              private readonly router: Router,
              private readonly activatedRoute: ActivatedRoute,
              private readonly alerts: AlertService,
              private readonly language: MenuLanguageService) {
  }

  ngOnInit(): void {
    this.loginRequest = new Login()
    this.form = new FormGroup({
        username: new FormControl(null, Validators.required),
        password: new FormControl(null, Validators.required)
      }
    )
  }


  protected login(): void {
    if (this.form.valid) {
      const values: any = this.form.value
      this.loginRequest.username = values['username']
      this.loginRequest.password = values['password']
      this.userRegisterService.login(this.loginRequest).subscribe((jwtResponse: JwtResponse) => {
        if (jwtResponse !== null) {
          this.webStorageService.setSession("jwtResponse", jwtResponse);
          // this.visible = false;
          this.alerts.show({
            header: this.language.text().loginSuccess,
            detail: this.language.text().loginSuccessDetail,
            status: 'success',
          });
          const returnUrl = this.activatedRoute.snapshot.queryParamMap.get('returnUrl');
          void this.router.navigateByUrl(returnUrl && ['/checkout', '/profile'].includes(returnUrl) ? returnUrl : '/products');
        } else {
          this.showLoginError();
        }
      }, errorResponse => this.showLoginError(errorResponse));
    } else {
      this.form.markAllAsTouched();
      this.alerts.show({
        header: this.language.text().invalidAuthInput,
        detail: this.language.text().invalidAuthInputDetail,
        status: 'warning',
      });
    }
  }

  private showLoginError(response?: { status?: number; error?: any }): void {
    const text = this.language.text();
    this.alerts.show({
      header: text.loginFailed,
      detail: authErrorMessage(response, text.loginFailedDetail, text.connectionError),
      status: 'error',
    });
  }

}
