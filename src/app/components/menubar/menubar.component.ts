import {Component, OnInit} from '@angular/core';
import {JwtResponse} from "../../entities/register/jwt-response";
import {User} from "../../entities/user";
import {WebStorageService} from "../../services/web-storage.service";
import {UsefulFunctionService} from "../../services/useful-function.service";

@Component({
  selector: 'ecm-menubar',
  templateUrl: './menubar.component.html',
  styleUrl: './menubar.component.css'
})
export class MenubarComponent implements OnInit {

  protected declare user: User | null
  protected declare jwtResponse: JwtResponse
  protected declare tokenExpire: number | null
  protected readonly UsefulFunctionService = UsefulFunctionService;

  constructor(private readonly webStorageService: WebStorageService) {}

  ngOnInit(): void {
    this.user = this.webStorageService.getUserFormToken()
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
    this.tokenExpire = this.webStorageService.getTokenExpiry();
    if (this.jwtResponse === null) {
      this.jwtResponse = new JwtResponse()
      this.jwtResponse.token = ''
    }
  }

}
