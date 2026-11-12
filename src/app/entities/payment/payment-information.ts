export class PaymentInformation {
  public amount: number;
  public currency: string;
  public sendToEmail: string;

  constructor(amount: number, currency: string, email: string) {
    this.amount = amount;
    this.currency = currency;
    this.sendToEmail = email;
  }
}
