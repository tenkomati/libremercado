import { Body, Controller, Headers, Param, Post, Req, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { GetInsuranceQuoteDto } from "./dto/get-insurance-quote.dto";
import { InsurancePolicyWebhookDto } from "./dto/insurance-policy-webhook.dto";
import { InsuranceService } from "./insurance.service";

@Controller("insurance")
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post("get-quote")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RateLimit({ keyPrefix: "insurance-quote", limit: 60, windowSeconds: 3600 })
  getQuote(
    @Body() dto: GetInsuranceQuoteDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.insuranceService.getQuote(dto, user.sub);
  }

  @Public()
  @Post("webhooks/:providerName")
  @RateLimit({ keyPrefix: "insurance-webhook", limit: 600, windowSeconds: 3600 })
  processWebhook(
    @Param("providerName") providerName: string,
    @Body() dto: InsurancePolicyWebhookDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: { rawBody?: Buffer }
  ) {
    return this.insuranceService.processPolicyWebhook(
      providerName,
      dto,
      headers,
      request.rawBody
    );
  }
}
