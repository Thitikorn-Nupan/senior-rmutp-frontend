import {Injectable} from "@angular/core";
import {environment} from "../../environments/environment.development";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {JwtResponse} from "../entities/register/jwt-response";
import {WebStorageService} from "./web-storage.service";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private readonly baseUrl = environment.baseUrl+'/file';
  private jwtResponse : JwtResponse;

  constructor(private readonly http: HttpClient,
              private readonly webStorageService:WebStorageService) {
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
  }

  public getDownloadQrUrl(fileFullName : string) : string {
    return `${this.baseUrl}/downloadQr?fileFullName=${fileFullName}`
  }

  public uploadQr(file : File): Observable<any> {
    // let headers = new HttpHeaders();
    // headers = headers.append('Content-Type', 'multipart/form-data');
    // headers = headers.append('enctype', 'multipart/form-data');
    // ** work
    // const headers = new HttpHeaders({ Authorization: `Bearer ${this.jwtResponse.token}`} );
    const formData = new FormData();
    formData.append("file", file);
    formData.append("reportProgress", "true");
    return this.http.post<any>(`${this.baseUrl}/uploadQr`, formData );
  }

  public uploadProduct(file : File,pcId : number): Observable<any> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.jwtResponse.token}`} );
    const formData = new FormData();
    formData.append("file", file);
    formData.append("reportProgress", "true");
    return this.http.post<any>(`${this.baseUrl}/uploadProduct?pcId=${pcId}`, formData ,{headers});
  }


}
