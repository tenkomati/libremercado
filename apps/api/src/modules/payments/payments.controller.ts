import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";
import { PaymentsService } from "./payments.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly auditService: AuditService
  ) {}

  @Post("checkout")
  @RateLimit({ keyPrefix: "payment-checkout", limit: 10, windowSeconds: 3600 })
  createCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    if (user.role !== UserRole.USER) {
      throw new BadRequestException("Only users can start checkout");
    }

    return this.paymentsService
      .createCheckout(dto, user.sub)
      .then(async (paymentIntent) => {
        await this.auditService.logAction({
          actorUserId: user.sub,
          actorRole: user.role,
          action: "PAYMENT_CHECKOUT_CREATED",
          resourceType: "payment_intent",
          resourceId: paymentIntent.id,
          metadata: {
            escrowId: paymentIntent.escrowId,
            provider: paymentIntent.provider,
            amount: paymentIntent.amount.toString()
          }
        });

        return paymentIntent;
      });
  }

  @Public()
  @Post("webhooks/:provider")
  @RateLimit({ keyPrefix: "payment-webhook", limit: 600, windowSeconds: 3600 })
  processWebhook(
    @Param("provider") provider: string,
    @Body() body: Omit<PaymentWebhookDto, "provider">,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: { rawBody?: Buffer }
  ) {
    return this.paymentsService.processWebhook(
      {
        ...body,
        provider: provider.toUpperCase() as PaymentWebhookDto["provider"],
        rawPayload: body.rawPayload ?? (body as Record<string, unknown>)
      },
      headers,
      request.rawBody
    );
  }

  @Get(":id")
  getPaymentIntent(
    @Param("id") id: string,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.paymentsService.getPaymentIntentById(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Post(":id/sandbox/approve")
  @RateLimit({ keyPrefix: "payment-sandbox-approve", limit: 120, windowSeconds: 3600 })
  approveSandboxPayment(
    @Param("id") id: string,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.paymentsService.approveSandboxPayment(id).then(async (paymentIntent) => {
      await this.auditService.logAction({
        actorUserId: user.sub,
        actorRole: user.role,
        action: "PAYMENT_SANDBOX_APPROVED",
        resourceType: "payment_intent",
        resourceId: id,
        metadata: {
          escrowId: paymentIntent.escrowId,
          provider: paymentIntent.provider,
          status: paymentIntent.status
        }
      });

      return paymentIntent;
    });
  }
}
