import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { PaymentsService } from "./payments.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly auditService: AuditService
  ) {}

  @Post("checkout")
  createCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    if (user.role !== UserRole.USER) {
      throw new BadRequestException("Only users can start checkout");
    }

    return this.paymentsService
      .createSandboxCheckout(dto, user.sub)
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

  @Get(":id")
  getPaymentIntent(
    @Param("id") id: string,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.paymentsService.getPaymentIntentById(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Post(":id/sandbox/approve")
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
