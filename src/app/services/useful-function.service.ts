export class UsefulFunctionService {
  public static convertUnixTimeToRealTime(unixTimestamp: number) {
    const date = new Date(unixTimestamp * 1000);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // Months are 0-based
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  public static createUnixTime() {
    const now = new Date();
    return Math.floor(now.getTime() / 1000)
  }
}
