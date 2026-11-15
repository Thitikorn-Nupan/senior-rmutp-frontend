import {Component, OnInit} from '@angular/core';
import {UserRegisterService} from "../../services/user-register.service";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Login} from "../../entities/register/login";
import {JwtResponse} from "../../entities/security/jwt-response";
import {WebStorageService} from "../../services/web-storage.service";
import {Router} from "@angular/router";
import {AlertService} from '../../services/alert.service';
import {MenuLanguageService} from '../../services/menu-language.service';
import {authErrorMessage} from '../../services/auth-error-message';

@Component({
  selector: 'app-register-form',
  templateUrl: './register-form.component.html',
  styleUrls: ['../auth-form.css', './register-form.component.css']
})
export class RegisterFormComponent implements OnInit {
  protected showPassword = false;

  protected declare form: FormGroup;
  protected declare loginRequest: Login
  // Legacy popup bindings retained while its template is commented out.
  protected iconMode: 'WARN' | 'ERROR' = 'WARN';
  public visible: boolean = false;
  protected headerTitle: string = 'Registration failed';
  protected declare body: string;


  constructor(private readonly userRegisterService: UserRegisterService,
              private readonly webStorageService: WebStorageService,
              private readonly router: Router,
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

  protected signIn(): void {
    if (this.form.valid) {
      const values: any = this.form.value
      this.loginRequest.username = values['username']
      this.loginRequest.password = values['password']
      this.userRegisterService.signIn(this.loginRequest).subscribe(
        (res) => {
          if (res) {
            // this.visible = false;
            this.alerts.show({
              header: this.language.text().registrationSuccess,
              detail: this.language.text().registrationSuccessDetail,
              status: 'success',
            });
            this.loginAfterRegistration();
          } else {
            this.showRegistrationError();
          }
        },
        errorResponse => this.showRegistrationError(errorResponse));
    } else {
      this.form.markAllAsTouched();
      this.alerts.show({
        header: this.language.text().invalidAuthInput,
        detail: this.language.text().invalidAuthInputDetail,
        status: 'warning',
      });
    }
  }

  private showRegistrationError(response?: { status?: number; error?: any }): void {
    const text = this.language.text();
    this.alerts.show({
      header: text.registrationFailed,
      detail: authErrorMessage(response, text.registrationFailedDetail, text.connectionError),
      status: 'error',
    });
  }

  /*protected setCloseEvent(): void {
    this.visible = false;
  }

  protected setOkEvent(): void {
    this.visible = false;
  }*/

  private loginAfterRegistration(): void {
    this.userRegisterService.login(this.loginRequest).subscribe({
      next: (jwtResponse: JwtResponse) => {
        if (jwtResponse !== null) {
          this.webStorageService.setSession("jwtResponse", jwtResponse);
          void this.router.navigate(['/products']);
        } else {
          this.showAutoLoginWarning();
        }
      },
      error: () => {
        this.showAutoLoginWarning();
      },
    });
  }

  private showAutoLoginWarning(): void {
    this.alerts.show({
      header: this.language.text().autoLoginFailed,
      detail: this.language.text().autoLoginFailedDetail,
      status: 'warning',
    });
    void this.router.navigate(['/login']);
  }


}
