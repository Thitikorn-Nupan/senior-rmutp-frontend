import {Component, OnInit} from '@angular/core';
import {OrderHistoryAdmin} from "../../entities/orders-history-admin/order-history-admin";
import {OrderHistoryService} from "../../services/order-history.service";
import {JwtResponse} from "../../entities/register/jwt-response";
import {Router} from "@angular/router";
import {User} from "../../entities/user";
import {WebStorageService} from "../../services/web-storage.service";
import {FileService} from "../../services/file.service";
import {FormControl, FormGroup, Validators} from "@angular/forms";

@Component({
  selector: 'app-order-history-admin',
  templateUrl: './order-history-admin.component.html',
  styleUrl: './order-history-admin.component.css'
})
export class OrderHistoryAdminComponent implements OnInit {

  protected declare user: User | null
  protected declare jwtResponse: JwtResponse
  protected declare orderHistoriesAdmin: OrderHistoryAdmin[]
  protected declare orderHistoriesAdminSearchMode: OrderHistoryAdmin[]
  private declare orderTrackingNumber: string

  protected declare form: FormGroup;
  protected enableForm: boolean = false;

  // ** Popup
  protected iconMode: 'WARN' | 'ERROR' | 'CONFIRM' = 'WARN';
  public visible: boolean = false;
  protected headerTitle: string = 'Update Failed';
  protected declare body: string;


  constructor(private readonly ordersHistoryService: OrderHistoryService,
              private readonly router: Router,
              private readonly webStorageService: WebStorageService,
              private readonly fileService: FileService) {
  }


  async ngOnInit(): Promise<void> {
    // await this.delay(800)
    // this.user = this.webStorageService.getUserFormToken()
    // this.jwtResponse = this.webStorageService.getSession("jwtResponse");
    // this.form = new FormGroup({
    //     trackingNumber: new FormControl(null, Validators.required)
    //   }
    // )
    // if (this.jwtResponse === null) {
    //   this.jwtResponse = new JwtResponse()
    //   this.jwtResponse.token = ''
    // }
    // this.loadOrderHistoriesAdmin()

    this.user = this.webStorageService.getUserFormToken()
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
    this.form = new FormGroup({
        trackingNumber: new FormControl(null, Validators.required)
      }
    )
    if (this.jwtResponse === null) {
      this.jwtResponse = new JwtResponse()
      this.jwtResponse.token = ''
    }
    await this.delay(800).then(() => ( this.loadOrderHistoriesAdmin()))
  }

  private loadOrderHistoriesAdmin() : void {
    this.ordersHistoryService.getOrdersHistoryForAdmin().subscribe(
      (response: OrderHistoryAdmin[]) => {
        this.orderHistoriesAdmin = response
        this.orderHistoriesAdminSearchMode = this.orderHistoriesAdmin
      }, (errorResponse) => { // Way to Catch Errors in Component
        this.visible = true
        this.iconMode = 'ERROR'
        this.headerTitle = 'Load Order Histories Failed'
        this.body = errorResponse['error']['description']
      })
  }

  // ** change
  protected getTotalPrice(): number {
    let total = 0;
    for (let i = 0; i < this.orderHistoriesAdminSearchMode.length; i++) {
      if (this.orderHistoriesAdminSearchMode[i].statusPurchase) {
        total += (this.orderHistoriesAdminSearchMode[i].price * this.orderHistoriesAdminSearchMode[i].quantity);
      }
    }
    return total
  }

  protected search(): void {
    if (this.form.valid) {
      // const trackingNumber = this.form.get('trackingNumber')?.value;
      this.orderHistoriesAdminSearchMode = this.orderHistoriesAdmin.filter(order => order.orderTrackingNumber.startsWith(this.form.get('trackingNumber')?.value))
      if (this.orderHistoriesAdminSearchMode.length === 0) {
        this.orderHistoriesAdminSearchMode = this.orderHistoriesAdmin
      }
    } else {
      this.orderHistoriesAdminSearchMode = this.orderHistoriesAdmin
    }
  }

  protected onClearSearch(): void {
    this.orderHistoriesAdminSearchMode = this.orderHistoriesAdmin
  }

  protected onSwitchMode(): void {
    this.enableForm = !this.enableForm
  }

  protected urlDownloadSlip(qrPurchaseUrl: string) {
    let fileFullName
    const index = qrPurchaseUrl.indexOf('qr_purchases');
    if (index !== -1) {
      fileFullName = qrPurchaseUrl.substring((index + 1) + 'qr_purchases'.length) // Character not found, return original string
    }
    if (fileFullName) {
      return this.fileService.getDownloadQrUrl(fileFullName)
    }
    return null
  }


  protected updateStatusPayment(orderTracking: string) : void {
    this.visible = true
    this.iconMode = 'CONFIRM'
    this.headerTitle = 'Confirm Update Payment'
    this.body = 'Are you sure you want to update status payment?'
    this.orderTrackingNumber = orderTracking
  }

  protected seePerfumesSaleOut() : void {
    this.router.navigate(['orders-history-only-perfumes-admin'])
  }


  protected setCloseEvent() : void {
    this.visible = false;
  }

  protected setOkEvent() : void {
    this.visible = false;
    if (this.iconMode === 'CONFIRM') {
      this.orderHistoriesAdmin.filter(order => {
        if (order.orderTrackingNumber === this.orderTrackingNumber) {
          order.statusPurchase = true
          // then update on database **  if user refresh. it's updated
          this.ordersHistoryService.updateStatusPurchaseForAdmin(this.orderTrackingNumber).subscribe(
            (res) => (console.log(res)),
            (errorResponse) => { // Way to Catch Errors in Component
              this.visible = true
              this.iconMode = 'ERROR'
              this.headerTitle = 'Update Failed'
              this.body = errorResponse['error']['description']
            })
        }
      })
      this.orderHistoriesAdminSearchMode = this.orderHistoriesAdmin
    }
    if (this.iconMode === 'ERROR') {
      this.webStorageService.clearSession()
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected onOpenSlip(qrPurchaseUrl: string) : void {
    window.open(qrPurchaseUrl, '_blank')
  }
}
