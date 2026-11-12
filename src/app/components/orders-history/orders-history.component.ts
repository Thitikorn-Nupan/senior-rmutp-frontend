import {Component, OnInit} from '@angular/core';
import {OrderHistory} from "../../entities/orders-history/order-history";
import {JwtResponse} from "../../entities/register/jwt-response";
import {OrderHistoryService} from "../../services/order-history.service";
import {WebStorageService} from "../../services/web-storage.service";
import {User} from "../../entities/user";
import {OrderHistoryAdmin} from "../../entities/orders-history-admin/order-history-admin";

@Component({
  selector: 'app-orders-history',
  templateUrl: './orders-history.component.html',
  styleUrl: './orders-history.component.css'
})
export class OrdersHistoryComponent implements OnInit {

  protected declare user: User | null
  protected declare jwtResponse: JwtResponse
  protected declare orderHistories: OrderHistory[]
  protected declare orderHistoriesDetails: OrderHistoryAdmin[] | null
  protected declare trackingNumber: string

  // ** Popup
  protected iconMode: 'WARN' | 'ERROR' = 'WARN';
  public visible: boolean = false;
  protected headerTitle: string = 'Update Failed';
  protected body!: string;


  constructor(private readonly ordersHistoryService: OrderHistoryService,
              private readonly webStorageService: WebStorageService) {
  }

  async ngOnInit(): Promise<void> {
    // await this.delay(800)
    // this.user = this.webStorageService.getUserFormToken()
    // this.jwtResponse = this.webStorageService.getSession("jwtResponse");
    // if (this.jwtResponse === null) {
    //   this.jwtResponse = new JwtResponse()
    //   this.jwtResponse.token = ''
    // }
    // this.loadOrderHistories()
    this.user = this.webStorageService.getUserFormToken()
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
    if (this.jwtResponse === null) {
      this.jwtResponse = new JwtResponse()
      this.jwtResponse.token = ''
    }
    await this.delay(800).then(() => (this.loadOrderHistories()))
  }

  private loadOrderHistories() {
    if (this.user) {
      this.ordersHistoryService.getOrderHistoryByEmail(this.user?.username).subscribe(
        (response: OrderHistory[]) => (this.orderHistories = response),
        (errorResponse) => { // Way to Catch Errors in Component
          this.visible = true
          this.iconMode = 'ERROR'
          this.headerTitle = 'Load Order Histories Failed'
          this.body = errorResponse['error']['description']
        })
    }
  }

  protected seeDetail(orderTrackingNumber: string): void {
    this.trackingNumber = orderTrackingNumber
    this.ordersHistoryService.getOrderHistoryByTrackingNumber(orderTrackingNumber).subscribe( // try check
      (res: OrderHistoryAdmin[]) => (this.orderHistoriesDetails = res),
      (errorResponse) => { // Way to Catch Errors in Component
        this.visible = true
        this.iconMode = 'ERROR'
        this.headerTitle = 'Load Detail Failed'
        this.body = errorResponse['error']['description']
      })
  }

  protected setCloseEvent() : void {
    this.visible = false;
  }

  protected setOkEvent(): void {
    this.visible = false;
    this.webStorageService.clearSession()
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }


  protected onCloseOrderHistory(): void {
    this.orderHistoriesDetails = null
  }
}
