import {Component, OnInit} from '@angular/core';
import {Router} from "@angular/router";
import {User} from "../../../entities/user";
import {JwtResponse} from "../../../entities/register/jwt-response";
import {WebStorageService} from "../../../services/web-storage.service";

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
              private readonly webStorageService: WebStorageService) {}

  ngOnInit(): void {
    this.user = this.webStorageService.getUserFormToken()
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
    if (this.jwtResponse === null) {
      this.jwtResponse = new JwtResponse()
      this.jwtResponse.token = ''
    }
    if (this.user && this.jwtResponse.token !== '') {
      if (this.user.roles === 'ROLE_USER') {
        this.isUserLogin = true
        this.isAdminLogin = false
      } else {
        this.isAdminLogin = true
        this.isUserLogin = true
      }
    }
  }

  protected logout(): void {
    this.router.navigate(['']).then(() => (this.webStorageService.clearSession()))
  }

  protected toggle(): void {
    this.isToggle = !this.isToggle
  }

}
