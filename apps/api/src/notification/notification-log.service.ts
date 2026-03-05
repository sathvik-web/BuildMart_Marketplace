import { Injectable } from "@nestjs/common";

@Injectable()
export class NotificationLogService {
  async log(data: any) {
    console.log("Notification log:", data);
  }
}