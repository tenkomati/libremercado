import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  getHealth() {
    return {
      service: "libremercado-api",
      status: "ok",
      modules: ["users", "kyc", "listings", "escrow"],
      timestamp: new Date().toISOString()
    };
  }
}
