import {Component, OnInit} from '@angular/core';
import {UserRegisterService} from "../../services/user-register.service";
import {Login} from "../../entities/register/login";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {WebStorageService} from "../../services/web-storage.service";
import {ActivatedRoute, Router} from "@angular/router";
import {JwtResponse} from "../../entities/security/jwt-response";

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['../auth-form.css', './login-form.component.css']
})
export class LoginFormComponent implements OnInit {
  protected showPassword = false;

  protected declare form: FormGroup;
  protected declare loginRequest: Login

  // ** Popup
  protected iconMode: 'WARN' | 'ERROR' = 'WARN';
  public visible: boolean = false;
  protected headerTitle: string = 'Login Failed';
  protected declare body: string;


  constructor(private readonly userRegisterService: UserRegisterService,
              private readonly webStorageService: WebStorageService,
              private readonly router: Router,
              private readonly activatedRoute: ActivatedRoute) {
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
          const returnUrl = this.activatedRoute.snapshot.queryParamMap.get('returnUrl');
          this.router.navigateByUrl(returnUrl === '/checkout' ? '/checkout' : '/products').then(() => window.location.reload());
        }
      }, (errorResponse): void => { // Way to Catch Errors in Component
        this.visible = true
        this.iconMode = 'ERROR'
        this.headerTitle = 'Error Login'
        this.body = errorResponse.error?.error?.message
          ?? (errorResponse.status === 0 ? 'Cannot connect to the server. Please try again.' : 'Unable to log in. Please check your credentials.')
      })
    } else {
      this.visible = true
      this.iconMode = 'WARN'
      this.headerTitle = 'Warning Input'
      this.body = 'Invalid input!'
    }
  }

  protected setCloseEvent(): void {
    this.visible = false;
  }

  protected setOkEvent(): void {
    this.visible = false;
  }

}
