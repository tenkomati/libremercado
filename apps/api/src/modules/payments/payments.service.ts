import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  EscrowEventType,
  EscrowStatus,
  NotificationType,
  PaymentProvider,
  PaymentStatus,
  Prisma
} from "@prisma/client";

import { EscrowService } from "../escrow/escrow.service";
import { PrismaService } from "../prisma/prisma.service";

import { CreateCheckoutDto } from "./dto/create-checkout.dto";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService
  ) {}

  async createSandboxCheckout(dto: CreateCheckoutDto, buyerId: string) {
    const escrow = await this.escrowService.createEscrow({
      listingId: dto.listingId,
      buyerId,
      shippingProvider: dto.shippingProvider ?? "Entrega protegida libremercado"
    });

    const providerPreferenceId = `sandbox_pref_${escrow.id}`;
    const checkoutUrl = `/account?paymentIntent=${providerPreferenceId}`;

    const paymentIntent = await this.prisma.paymentIntent.create({
      data: {
        escrowId: escrow.id,
        buyerId: escrow.buyerId,
        sellerId: escrow.sellerId,
        provider: PaymentProvider.SANDBOX,
        status: PaymentStatus.PAYMENT_PENDING,
        amount: escrow.amount,
        feeAmount: escrow.feeAmount,
        netAmount: escrow.netAmount,
        currency: escrow.currency,
        checkoutUrl,
        providerPreferenceId,
        providerStatus: "created",
        providerRawPayload: {
          adapter: "sandbox",
          checkoutUrl
        },
        events: {
          create: {
            provider: PaymentProvider.SANDBOX,
            status: PaymentStatus.PAYMENT_PENDING,
            providerEventId: `${providerPreferenceId}_created`,
            rawPayload: {
              adapter: "sandbox",
              action: "checkout_created"
            }
          }
        }
      },
      include: this.getPaymentIntentInclude()
    });

    await this.prisma.userNotification.createMany({
      data: [
        {
          userId: escrow.buyerId,
          type: NotificationType.PAYMENT_UPDATED,
          title: "Pago protegido iniciado",
          body: "Creamos la intención de pago. Cuando el pago se apruebe, los fondos quedarán protegidos.",
          resourceType: "payment_intent",
          resourceId: paymentIntent.id
        },
        {
          userId: escrow.sellerId,
          type: NotificationType.PAYMENT_UPDATED,
          title: "Nueva operación pendiente de pago",
          body: "Un comprador inició una compra protegida. Te avisaremos cuando los fondos estén acreditados.",
          resourceType: "payment_intent",
          resourceId: paymentIntent.id
        }
      ]
    });

    return paymentIntent;
  }

  async getPaymentIntentById(id: string, user: { sub: string; role: string }) {
    const paymentIntent = await this.prisma.paymentIntent.findUnique({
      where: { id },
      include: this.getPaymentIntentInclude()
    });

    if (!paymentIntent) {
      throw new NotFoundException(`Payment intent ${id} not found`);
    }

    if (
      user.role !== "ADMIN" &&
      user.role !== "OPS" &&
      paymentIntent.buyerId !== user.sub &&
      paymentIntent.sellerId !== user.sub
    ) {
      throw new BadRequestException("Users can only access their own payments");
    }

    return paymentIntent;
  }

  async approveSandboxPayment(id: string) {
    const paymentIntent = await this.prisma.paymentIntent.findUnique({
      where: { id }
    });

    if (!paymentIntent) {
      throw new NotFoundException(`Payment intent ${id} not found`);
    }

    if (paymentIntent.provider !== PaymentProvider.SANDBOX) {
      throw new BadRequestException("Only sandbox payments can be manually approved");
    }

    if (paymentIntent.status !== PaymentStatus.PAYMENT_PENDING) {
      throw new BadRequestException("Only pending payments can be approved");
    }

    const now = new Date();
    const updatedPaymentIntent = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.paymentIntent.update({
        where: { id },
        data: {
          status: PaymentStatus.FUNDS_HELD,
          providerPaymentId: `sandbox_pay_${id}`,
          providerStatus: "approved",
          providerRawPayload: {
            adapter: "sandbox",
            action: "payment_approved",
            approvedAt: now.toISOString()
          },
          approvedAt: now,
          fundsHeldAt: now,
          events: {
            create: [
              {
                provider: PaymentProvider.SANDBOX,
                status: PaymentStatus.PAYMENT_APPROVED,
                providerEventId: `sandbox_${id}_approved`,
                rawPayload: {
                  adapter: "sandbox",
                  action: "payment_approved"
                }
              },
              {
                provider: PaymentProvider.SANDBOX,
                status: PaymentStatus.FUNDS_HELD,
                providerEventId: `sandbox_${id}_funds_held`,
                rawPayload: {
                  adapter: "sandbox",
                  action: "funds_held"
                }
              }
            ]
          }
        },
        include: this.getPaymentIntentInclude()
      });

      await tx.escrowTransaction.update({
        where: { id: paymentIntent.escrowId },
        data: {
          status: EscrowStatus.FUNDS_HELD,
          events: {
            create: {
              type: EscrowEventType.FUNDS_HELD,
              payload: {
                paymentIntentId: id,
                provider: PaymentProvider.SANDBOX,
                amount: paymentIntent.amount.toString(),
                currency: paymentIntent.currency
              }
            }
          }
        }
      });

      return updated;
    });

    await this.prisma.userNotification.createMany({
      data: [
        {
          userId: paymentIntent.buyerId,
          type: NotificationType.PAYMENT_UPDATED,
          title: "Pago recibido y protegido",
          body: "El pago fue aprobado y los fondos quedaron protegidos hasta que la operación se concrete.",
          resourceType: "payment_intent",
          resourceId: id
        },
        {
          userId: paymentIntent.sellerId,
          type: NotificationType.PAYMENT_UPDATED,
          title: "Fondos protegidos acreditados",
          body: "La compra ya tiene fondos protegidos. Podés avanzar con la entrega acordada.",
          resourceType: "payment_intent",
          resourceId: id
        }
      ]
    });

    return updatedPaymentIntent;
  }

  private getPaymentIntentInclude() {
    return {
      escrow: {
        include: {
          listing: {
            select: {
              id: true,
              title: true
            }
          }
        }
      },
      events: {
        orderBy: {
          createdAt: "asc" as const
        }
      }
    } satisfies Prisma.PaymentIntentInclude;
  }
}
