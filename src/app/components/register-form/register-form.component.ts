import {Component, OnInit} from '@angular/core';
import {UserRegisterService} from "../../services/user-register.service";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Login} from "../../entities/register/login";
import {JwtResponse} from "../../entities/security/jwt-response";
import {WebStorageService} from "../../services/web-storage.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-register-form',
  templateUrl: './register-form.component.html',
  styleUrls: ['../auth-form.css', './register-form.component.css']
})
export class RegisterFormComponent implements OnInit {
  protected showPassword = false;

  protected declare form: FormGroup;
  protected declare loginRequest : Login
  // ** Popup
  protected iconMode : 'WARN' | 'ERROR' | 'SUCCESS' = 'WARN';
  public visible : boolean = false;
  protected headerTitle : string = 'Registration failed';
  protected declare body : string;


  constructor(private readonly userRegisterService: UserRegisterService,
              private readonly webStorageService: WebStorageService,
              private readonly router: Router) {}

  ngOnInit(): void {
    this.loginRequest = new Login()
    this.form = new FormGroup({
        username: new FormControl(null,Validators.required),
        password: new FormControl(null,Validators.required)
      }
    )
  }

  protected signIn(): void {
    if (this.form.valid) {
      const values : any = this.form.value
      this.loginRequest.username = values['username']
      this.loginRequest.password = values['password']
      this.userRegisterService.signIn(this.loginRequest).subscribe(
        (res) => {
          // (res ?  this.userRegisterService.login(this.loginRequest) : null)
          if (res) {
            this.visible = true
            this.iconMode = 'SUCCESS'
            this.headerTitle = 'Account created'
            this.body = 'Your account is ready. Select OK to continue.'
          }
        },
        (errorResponse): void => {
          this.visible = true
          this.iconMode = 'ERROR'
          this.headerTitle = 'Registration failed'
          this.body = errorResponse['error']['message']
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
    if (this.iconMode ==='SUCCESS') {
      this.userRegisterService.login(this.loginRequest).subscribe((jwtResponse: JwtResponse) => {
        if (jwtResponse !== null) {
          this.webStorageService.setSession("jwtResponse",jwtResponse);
          this.router.navigate(['']).then(() => (window.location.reload()))
        }
      })
    }
  }


}
