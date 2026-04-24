import { createHmac, timingSafeEqual } from "node:crypto";

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import {
  EscrowEventType,
  EscrowStatus,
  NotificationType,
  PaymentProvider,
  PaymentStatus,
  Prisma
} from "@prisma/client";

import { EmailService } from "../email/email.service";
import { EscrowService } from "../escrow/escrow.service";
import { InsuranceService } from "../insurance/insurance.service";
import { PrismaService } from "../prisma/prisma.service";

import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";
import {
  ExternalRedirectPaymentAdapter,
  NormalizedPaymentWebhook,
  PaymentAdapter,
  SandboxPaymentAdapter
} from "./payment-adapters";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    private readonly insuranceService: InsuranceService,
    private readonly emailService: EmailService
  ) {}

  async createCheckout(dto: CreateCheckoutDto, buyerId: string) {
    const insuranceQuote = dto.insuranceSelected
      ? await this.insuranceService.prepareCheckoutInsurance(dto.listingId, buyerId)
      : null;
    const escrow = await this.escrowService.createEscrow({
      listingId: dto.listingId,
      buyerId,
      shippingProvider: dto.shippingProvider ?? "Entrega protegida libremercado",
      isInsured: Boolean(insuranceQuote),
      insuranceFee: insuranceQuote ? Number(insuranceQuote.pricing.premiumAmount) : 0
    });

    const adapter = this.getConfiguredAdapter();
    const checkout = adapter.createCheckout({
      escrowId: escrow.id,
      amount: escrow.amount.add(escrow.insuranceFee),
      feeAmount: escrow.feeAmount,
      netAmount: escrow.netAmount,
      currency: escrow.currency
    });

    const paymentIntent = await this.prisma.paymentIntent.create({
      data: {
        escrowId: escrow.id,
        buyerId: escrow.buyerId,
        sellerId: escrow.sellerId,
        provider: adapter.provider,
        status: PaymentStatus.PAYMENT_PENDING,
        amount: escrow.amount.add(escrow.insuranceFee),
        feeAmount: escrow.feeAmount,
        netAmount: escrow.netAmount,
        currency: escrow.currency,
        checkoutUrl: checkout.checkoutUrl,
        providerPreferenceId: checkout.providerPreferenceId,
        providerStatus: checkout.providerStatus,
        providerRawPayload: checkout.rawPayload,
        events: {
          create: {
            provider: adapter.provider,
            status: PaymentStatus.PAYMENT_PENDING,
            providerEventId: `${checkout.providerPreferenceId}_created`,
            rawPayload: {
              action: "checkout_created",
              provider: adapter.provider
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
          body: insuranceQuote
            ? "Creamos la intención de pago con micro-seguro. Cuando el pago se apruebe, emitiremos la póliza."
            : "Creamos la intención de pago. Cuando el pago se apruebe, los fondos quedarán protegidos.",
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

    await this.emailService.sendBulkNotificationEmails([
      {
        userId: escrow.buyerId,
        title: "Pago protegido iniciado",
        body: insuranceQuote
          ? "Creamos la intención de pago con micro-seguro. Cuando el pago se apruebe, emitiremos la póliza."
          : "Creamos la intención de pago. Cuando el pago se apruebe, los fondos quedarán protegidos.",
        resourceType: "payment_intent",
        resourceId: paymentIntent.id
      },
      {
        userId: escrow.sellerId,
        title: "Nueva operación pendiente de pago",
        body: "Un comprador inició una compra protegida. Te avisaremos cuando los fondos estén acreditados.",
        resourceType: "payment_intent",
        resourceId: paymentIntent.id
      }
    ]);

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

    await this.emailService.sendBulkNotificationEmails([
      {
        userId: paymentIntent.buyerId,
        title: "Pago recibido y protegido",
        body: "El pago fue aprobado y los fondos quedaron protegidos hasta que la operación se concrete.",
        resourceType: "payment_intent",
        resourceId: id
      },
      {
        userId: paymentIntent.sellerId,
        title: "Fondos protegidos acreditados",
        body: "La compra ya tiene fondos protegidos. Podés avanzar con la entrega acordada.",
        resourceType: "payment_intent",
        resourceId: id
      }
    ]);

    await this.insuranceService.issuePolicyForEscrow(paymentIntent.escrowId);

    return updatedPaymentIntent;
  }

  async processWebhook(
    dto: PaymentWebhookDto,
    headers: Record<string, string | string[] | undefined>,
    rawBody?: Buffer
  ) {
    this.assertPaymentProvider(dto.provider);
    this.verifyWebhookSignature(dto.provider, headers, rawBody, dto.rawPayload ?? dto);

    const adapter = this.getAdapter(dto.provider);
    const rawWebhookPayload = (dto.rawPayload ?? dto) as Record<string, unknown>;
    const normalized = dto.status
      ? this.normalizeDtoWebhook(dto)
      : adapter.normalizeWebhook(rawWebhookPayload);

    const paymentIntent = await this.findPaymentIntentForWebhook(normalized);

    if (!paymentIntent) {
      throw new NotFoundException("Payment intent not found for webhook");
    }

    const existingEvent = await this.prisma.paymentEvent.findFirst({
      where: {
        provider: dto.provider,
        providerEventId: normalized.eventId
      }
    });

    if (existingEvent) {
      return {
        received: true,
        duplicate: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      };
    }

    const updated = await this.applyWebhookStatus(
      paymentIntent.id,
      dto.provider,
      normalized
    );

    if (normalized.status === PaymentStatus.FUNDS_HELD) {
      await this.insuranceService.issuePolicyForEscrow(paymentIntent.escrowId);
    }

    await this.notifyPaymentWebhookUpdate(updated, normalized.status);

    return {
      received: true,
      duplicate: false,
      paymentIntentId: updated.id,
      status: updated.status
    };
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

  private getConfiguredAdapter() {
    const configuredProvider = this.getProviderFromEnv(
      process.env.PAYMENT_PROVIDER ?? "SANDBOX"
    );

    return this.getAdapter(configuredProvider);
  }

  private getAdapter(provider: PaymentProvider): PaymentAdapter {
    if (provider === PaymentProvider.SANDBOX) {
      return new SandboxPaymentAdapter();
    }

    return new ExternalRedirectPaymentAdapter(
      provider,
      process.env.PAYMENT_CHECKOUT_BASE_URL
    );
  }

  private getProviderFromEnv(value: string) {
    const normalized = value.trim().toUpperCase();

    if (normalized in PaymentProvider) {
      return PaymentProvider[normalized as keyof typeof PaymentProvider];
    }

    throw new BadRequestException(`Unsupported PAYMENT_PROVIDER ${value}`);
  }

  private verifyWebhookSignature(
    provider: PaymentProvider,
    headers: Record<string, string | string[] | undefined>,
    rawBody?: Buffer,
    fallbackPayload?: unknown
  ) {
    const secret = this.getWebhookSecret(provider);

    if (!secret) {
      throw new UnauthorizedException(
        `Webhook secret is not configured for ${provider}`
      );
    }

    const providedSignature = this.getHeader(headers, "x-lm-signature");

    if (!providedSignature) {
      throw new UnauthorizedException("Missing webhook signature");
    }

    const body = rawBody?.length
      ? rawBody
      : Buffer.from(JSON.stringify(fallbackPayload ?? {}));
    const expectedSignature = createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    const provided = Buffer.from(providedSignature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      throw new UnauthorizedException("Invalid webhook signature");
    }
  }

  private getWebhookSecret(provider: PaymentProvider) {
    return (
      process.env[`PAYMENT_WEBHOOK_SECRET_${provider}`] ??
      process.env.PAYMENT_WEBHOOK_SECRET
    );
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ) {
    const value = headers[name] ?? headers[name.toLowerCase()];

    return Array.isArray(value) ? value[0] : value;
  }

  private normalizeDtoWebhook(dto: PaymentWebhookDto): NormalizedPaymentWebhook {
    return {
      eventId: dto.eventId ?? `${dto.provider.toLowerCase()}_${Date.now()}`,
      paymentIntentId: dto.paymentIntentId,
      providerPaymentId: dto.providerPaymentId,
      providerPreferenceId: dto.providerPreferenceId,
      status: dto.status ?? PaymentStatus.PAYMENT_PENDING,
      providerStatus: dto.providerStatus ?? dto.status ?? "unknown",
      rawPayload: (dto.rawPayload ?? dto) as Prisma.InputJsonValue
    };
  }

  private findPaymentIntentForWebhook(webhook: NormalizedPaymentWebhook) {
    if (
      !webhook.paymentIntentId &&
      !webhook.providerPaymentId &&
      !webhook.providerPreferenceId
    ) {
      throw new BadRequestException(
        "Webhook must include paymentIntentId, providerPaymentId or providerPreferenceId"
      );
    }

    return this.prisma.paymentIntent.findFirst({
      where: {
        OR: [
          webhook.paymentIntentId ? { id: webhook.paymentIntentId } : undefined,
          webhook.providerPaymentId
            ? { providerPaymentId: webhook.providerPaymentId }
            : undefined,
          webhook.providerPreferenceId
            ? { providerPreferenceId: webhook.providerPreferenceId }
            : undefined
        ].filter(Boolean) as Prisma.PaymentIntentWhereInput[]
      }
    });
  }

  private assertPaymentProvider(provider: PaymentProvider) {
    if (!Object.values(PaymentProvider).includes(provider)) {
      throw new BadRequestException(`Unsupported payment provider ${provider}`);
    }
  }

  private async applyWebhookStatus(
    paymentIntentId: string,
    provider: PaymentProvider,
    webhook: NormalizedPaymentWebhook
  ) {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.paymentIntent.findUnique({
        where: { id: paymentIntentId }
      });

      if (!current) {
        throw new NotFoundException(`Payment intent ${paymentIntentId} not found`);
      }

      const timestampPatch = this.getPaymentTimestampPatch(webhook.status, now);
      const updated = await tx.paymentIntent.update({
        where: { id: paymentIntentId },
        data: {
          status: webhook.status,
          providerPaymentId:
            webhook.providerPaymentId ?? current.providerPaymentId,
          providerPreferenceId:
            webhook.providerPreferenceId ?? current.providerPreferenceId,
          providerStatus: webhook.providerStatus,
          providerRawPayload: webhook.rawPayload,
          ...timestampPatch,
          events: {
            create: {
              provider,
              status: webhook.status,
              providerEventId: webhook.eventId,
              rawPayload: webhook.rawPayload
            }
          }
        },
        include: this.getPaymentIntentInclude()
      });

      await this.applyEscrowStatusFromPayment(tx, current, provider, webhook);

      return updated;
    });
  }

  private getPaymentTimestampPatch(status: PaymentStatus, now: Date) {
    if (status === PaymentStatus.PAYMENT_APPROVED) {
      return { approvedAt: now };
    }

    if (status === PaymentStatus.FUNDS_HELD) {
      return { approvedAt: now, fundsHeldAt: now };
    }

    if (status === PaymentStatus.READY_TO_RELEASE) {
      return { readyToReleaseAt: now };
    }

    if (status === PaymentStatus.RELEASED) {
      return { releasedAt: now };
    }

    if (status === PaymentStatus.REFUNDED) {
      return { refundedAt: now };
    }

    if (status === PaymentStatus.FAILED) {
      return { failedAt: now };
    }

    return {};
  }

  private async applyEscrowStatusFromPayment(
    tx: Prisma.TransactionClient,
    paymentIntent: { escrowId: string; amount: Prisma.Decimal; currency: string },
    provider: PaymentProvider,
    webhook: NormalizedPaymentWebhook
  ) {
    if (webhook.status === PaymentStatus.FUNDS_HELD) {
      await tx.escrowTransaction.update({
        where: { id: paymentIntent.escrowId },
        data: {
          status: EscrowStatus.FUNDS_HELD,
          events: {
            create: {
              type: EscrowEventType.FUNDS_HELD,
              payload: {
                paymentIntentId: webhook.paymentIntentId,
                provider,
                providerPaymentId: webhook.providerPaymentId,
                amount: paymentIntent.amount.toString(),
                currency: paymentIntent.currency
              }
            }
          }
        }
      });
    }

    if (webhook.status === PaymentStatus.REFUNDED) {
      await tx.escrowTransaction.update({
        where: { id: paymentIntent.escrowId },
        data: {
          status: EscrowStatus.REFUNDED,
          events: {
            create: {
              type: EscrowEventType.REFUNDED,
              payload: {
                provider,
                providerPaymentId: webhook.providerPaymentId,
                source: "payment_webhook"
              }
            }
          }
        }
      });
    }

    if (webhook.status === PaymentStatus.DISPUTED) {
      await tx.escrowTransaction.update({
        where: { id: paymentIntent.escrowId },
        data: {
          status: EscrowStatus.DISPUTED,
          disputeReason: "Disputa informada por proveedor de pago.",
          events: {
            create: {
              type: EscrowEventType.DISPUTED,
              payload: {
                provider,
                providerPaymentId: webhook.providerPaymentId,
                source: "payment_webhook"
              }
            }
          }
        }
      });
    }
  }

  private async notifyPaymentWebhookUpdate(
    paymentIntent: {
      id: string;
      buyerId: string;
      sellerId: string;
      status: PaymentStatus;
    },
    status: PaymentStatus
  ) {
    const notableStatuses: PaymentStatus[] = [
      PaymentStatus.FUNDS_HELD,
      PaymentStatus.REFUNDED,
      PaymentStatus.DISPUTED,
      PaymentStatus.FAILED
    ];

    if (!notableStatuses.includes(status)) {
      return;
    }

    const copy = this.getPaymentStatusCopy(status);

    await this.prisma.userNotification.createMany({
      data: [
        {
          userId: paymentIntent.buyerId,
          type: NotificationType.PAYMENT_UPDATED,
          title: copy.buyerTitle,
          body: copy.buyerBody,
          resourceType: "payment_intent",
          resourceId: paymentIntent.id
        },
        {
          userId: paymentIntent.sellerId,
          type: NotificationType.PAYMENT_UPDATED,
          title: copy.sellerTitle,
          body: copy.sellerBody,
          resourceType: "payment_intent",
          resourceId: paymentIntent.id
        }
      ]
    });

    await this.emailService.sendBulkNotificationEmails([
      {
        userId: paymentIntent.buyerId,
        title: copy.buyerTitle,
        body: copy.buyerBody,
        resourceType: "payment_intent",
        resourceId: paymentIntent.id
      },
      {
        userId: paymentIntent.sellerId,
        title: copy.sellerTitle,
        body: copy.sellerBody,
        resourceType: "payment_intent",
        resourceId: paymentIntent.id
      }
    ]);
  }

  private getPaymentStatusCopy(status: PaymentStatus) {
    if (status === PaymentStatus.FUNDS_HELD) {
      return {
        buyerTitle: "Pago recibido y protegido",
        buyerBody: "El proveedor confirmó el pago y los fondos quedaron protegidos.",
        sellerTitle: "Fondos protegidos acreditados",
        sellerBody: "La compra ya tiene fondos protegidos. Podés avanzar con la entrega."
      };
    }

    if (status === PaymentStatus.REFUNDED) {
      return {
        buyerTitle: "Pago reembolsado",
        buyerBody: "El proveedor informó el reembolso de la operación.",
        sellerTitle: "Operación reembolsada",
        sellerBody: "El proveedor informó un reembolso sobre esta venta."
      };
    }

    if (status === PaymentStatus.DISPUTED) {
      return {
        buyerTitle: "Pago en disputa",
        buyerBody: "El proveedor informó una disputa. Operaciones revisará el caso.",
        sellerTitle: "Venta en disputa",
        sellerBody: "El proveedor informó una disputa. Operaciones revisará el caso."
      };
    }

    return {
      buyerTitle: "Pago no aprobado",
      buyerBody: "El proveedor no aprobó el pago de la operación.",
      sellerTitle: "Pago no aprobado",
      sellerBody: "El proveedor no aprobó el pago de la operación."
    };
  }
}
