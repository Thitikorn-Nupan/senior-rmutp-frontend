import {Component, OnInit} from '@angular/core';
import {OrderHistoryService} from "../../services/order-history.service";
import {JwtResponse} from "../../entities/register/jwt-response";
import {OrderHistoryAdmin} from "../../entities/orders-history-admin/order-history-admin";
import {User} from "../../entities/user";
import {WebStorageService} from "../../services/web-storage.service";
import {HttpResponse} from "@angular/common/http";
import {saveAs} from 'file-saver';
import {Subscribable, Subscription} from "rxjs";

@Component({
  selector: 'app-order-history-only-perfumes-admin',
  templateUrl: './order-history-only-perfumes-admin.component.html',
  styleUrl: './order-history-only-perfumes-admin.component.css'
})
export class OrderHistoryOnlyPerfumesAdminComponent implements OnInit{

  protected declare user: User | null
  protected declare jwtResponse: JwtResponse
  protected declare orderHistoriesAdmin: OrderHistoryAdmin[] | undefined

  // ** Popup
  protected iconMode : 'WARN' | 'ERROR' = 'WARN';
  public visible : boolean = false;
  protected isLoadingFilePdf: boolean = false
  protected isLoadingFileExcel: boolean = false
  protected headerTitle : string = '';
  protected body! : string;


  constructor(private readonly ordersHistoryService: OrderHistoryService,
              private readonly webStorageService: WebStorageService) {
  }

  async ngOnInit(): Promise<void> {
    // await this.delay(800)
    // this.loadOrderHistoriesOnlyPerfumesAdmin()
    await this.delay(800).then(() => (this.loadOrderHistoriesOnlyPerfumesAdmin()))
  }

  private loadOrderHistoriesOnlyPerfumesAdmin(): void   {
    this.ordersHistoryService.getOrderHistoryOnlyPerfumesForAdmin().subscribe(
      (orderHistoryAdmins: OrderHistoryAdmin[]) => (this.orderHistoriesAdmin = orderHistoryAdmins),
      (errorResponse : any) => { // Way to Catch Errors in Component
        this.visible = true
        this.iconMode = 'ERROR'
        this.headerTitle = 'Load Order Histories Failed'
        this.body = errorResponse['error']['description']
      })
  }

  protected getTotalPrice(): number {
    let total: number = 0;
    if (this.orderHistoriesAdmin) {
      for (let i: number = 0; i < this.orderHistoriesAdmin.length; i++) {
        total += (this.orderHistoriesAdmin[i].price * this.orderHistoriesAdmin[i].quantity);
      }
    }
    return total
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

  protected onDownloadSoldOutExcel() : Subscription {
    // const orderHistoriesAdmin : undefined = undefined
    // const holdOrderHistoryAdmin : OrderHistoryAdmin[] | undefined = this.orderHistoriesAdmin
    // this.orderHistoriesAdmin = orderHistoriesAdmin
    this.isLoadingFileExcel = true
    return this.ordersHistoryService.downloadDocFile('XLSX').subscribe((res: HttpResponse<any>): void => {
      if (res.body) { //  && res.headers.has('File-Name')
        const filename: string = 'perfumes_shop_sold_out.xlsx'
        saveAs(res.body, filename);
        this.isLoadingFileExcel = false
      }
    })
  }

  protected onDownloadSoldOutPdf() : Subscription  {
    // const orderHistoriesAdmin : undefined = undefined
    // const holdOrderHistoryAdmin : OrderHistoryAdmin[] | undefined = this.orderHistoriesAdmin
    // this.orderHistoriesAdmin = orderHistoriesAdmin
    this.isLoadingFilePdf = true
    return this.ordersHistoryService.downloadDocFile('PDF').subscribe((res: any): void => {
      if (res.body) { // && res.headers.has('File-Name')
        const filename: string = 'perfumes_shop_sold_out.pdf'
        saveAs(res.body, filename);
        this.isLoadingFilePdf = false
      }
    })
  }
}
