import { createHmac, timingSafeEqual } from "node:crypto";

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException
} from "@nestjs/common";
import { NotificationType, Prisma, UserRole } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import {
  getPagination,
  getSafeSortBy,
  getSortOrder,
  makePaginationMeta
} from "../common/pagination";
import { EmailService } from "../email/email.service";
import { ListingsService } from "../listings/listings.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

import { CreateInsuranceClaimDto } from "./dto/create-insurance-claim.dto";
import { GetInsuranceQuoteDto } from "./dto/get-insurance-quote.dto";
import { InsurancePolicyWebhookDto } from "./dto/insurance-policy-webhook.dto";
import { ListInsurancePoliciesQueryDto } from "./dto/list-insurance-policies-query.dto";
import { ResolveInsuranceClaimDto } from "./dto/resolve-insurance-claim.dto";
import { UpdateInsurancePolicyStatusDto } from "./dto/update-insurance-policy-status.dto";
import {
  BaseInsuranceProvider
} from "./providers/base-insurance-provider";
import { GenericInsurtechProvider } from "./providers/generic-insurtech.provider";

@Injectable()
export class InsuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listingsService: ListingsService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService
  ) {}

  async getQuote(dto: GetInsuranceQuoteDto, userId: string) {
    const listing = await this.listingsService.getListingById(dto.productId);
    const user = await this.usersService.ensureExists(userId);
    const provider = await this.getOrCreateDefaultProvider();
    const providerClient = this.getProviderClient(provider);
    const effectivePrice = dto.price
      ? new Prisma.Decimal(dto.price)
      : new Prisma.Decimal(listing.price);
    const quote = await providerClient.getQuote({
      category: listing.category,
      price: effectivePrice
    });

    return {
      productId: listing.id,
      productTitle: listing.title,
      category: listing.category,
      eligible: quote.eligible,
      requiresIdentityVerified: user.kycStatus !== "APPROVED",
      provider: {
        id: provider.id,
        name: provider.name
      },
      pricing: {
        productPrice: effectivePrice.toString(),
        ratePercentage: quote.ratePercentage.toString(),
        premiumAmount: quote.premiumAmount.toString(),
        coverageAmount: quote.coverageAmount.toString(),
        totalWithInsurance: effectivePrice.add(quote.premiumAmount).toString()
      },
      reason: quote.reason ?? null
    };
  }

  async listPolicies(query: ListInsurancePoliciesQueryDto) {
    const pagination = getPagination(query);
    const sortBy = getSafeSortBy(
      query.sortBy,
      ["createdAt", "updatedAt", "status", "premiumAmount", "coverageAmount"] as const,
      "createdAt"
    );
    const where: Prisma.InsurancePolicyWhereInput = {
      status: query.status,
      provider: query.providerName
        ? { name: { equals: query.providerName, mode: "insensitive" } }
        : undefined,
      ...(query.q
        ? {
            OR: [
              { externalPolicyId: { contains: query.q, mode: "insensitive" } },
              { escrowId: { contains: query.q, mode: "insensitive" } },
              { provider: { name: { contains: query.q, mode: "insensitive" } } },
              { escrow: { listing: { title: { contains: query.q, mode: "insensitive" } } } },
              { escrow: { buyer: { email: { contains: query.q, mode: "insensitive" } } } },
              { escrow: { seller: { email: { contains: query.q, mode: "insensitive" } } } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.insurancePolicy.findMany({
        where,
        include: {
          provider: true,
          escrow: {
            include: {
              listing: {
                select: {
                  id: true,
                  title: true,
                  category: true
                }
              },
              buyer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              },
              seller: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          [sortBy]: getSortOrder(query.sortOrder)
        },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.insurancePolicy.count({ where })
    ]);

    return {
      items,
      meta: makePaginationMeta({
        page: pagination.page,
        pageSize: pagination.pageSize,
        total
      })
    };
  }

  async submitClaim(
    id: string,
    dto: CreateInsuranceClaimDto,
    actor: { sub: string; role: UserRole }
  ) {
    const policy = await this.getPolicyById(id);
    const isAdminLike = actor.role === UserRole.ADMIN || actor.role === UserRole.OPS;

    if (!isAdminLike && policy.escrow.buyerId !== actor.sub) {
      throw new ForbiddenException(
        "Solo el comprador titular puede iniciar un reclamo del seguro."
      );
    }

    if (policy.status !== "ACTIVE" && policy.status !== "CLAIMED") {
      throw new BadRequestException(
        "La póliza debe estar activa para abrir un reclamo."
      );
    }

    const previousPayload = this.asJsonObject(policy.rawPayload);
    const previousClaim = this.readClaim(previousPayload);
    const evidenceUrls = this.parseEvidenceUrls(dto.evidenceUrls);
    const claimPayload = {
      status: "OPEN",
      reason: dto.reason,
      details: dto.details,
      contactPhone:
        dto.contactPhone?.trim() ||
        policy.escrow.buyer.phone ||
        null,
      openedAt: previousClaim?.openedAt ?? new Date().toISOString(),
      openedByUserId: previousClaim?.openedByUserId ?? actor.sub,
      updatedAt: new Date().toISOString(),
      evidenceUrls
    } satisfies Prisma.JsonObject;

    const updated = await this.prisma.insurancePolicy.update({
      where: { id },
      data: {
        status: "CLAIMED",
        rawPayload: {
          ...previousPayload,
          claim: claimPayload
        }
      }
    });

    await this.auditService.logAction({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: "INSURANCE_CLAIM_OPENED",
      resourceType: "insurance_policy",
      resourceId: id,
      metadata: {
        reason: dto.reason,
        contactPhone: claimPayload.contactPhone,
        evidenceCount: evidenceUrls.length,
        escrowId: policy.escrowId,
        previousStatus: policy.status,
        nextStatus: "CLAIMED"
      }
    });

    await this.prisma.userNotification.createMany({
      data: [
        {
          userId: policy.escrow.buyerId,
          type: NotificationType.PAYMENT_UPDATED,
          title: "Reclamo de seguro enviado",
          body: `Recibimos tu reclamo para ${policy.escrow.listing.title}. El equipo operativo lo revisará.`,
          resourceType: "insurance_policy",
          resourceId: updated.id
        },
        {
          userId: policy.escrow.sellerId,
          type: NotificationType.PAYMENT_UPDATED,
          title: "Se abrió un reclamo de seguro",
          body: `La operación de ${policy.escrow.listing.title} tiene un reclamo de seguro en revisión.`,
          resourceType: "insurance_policy",
          resourceId: updated.id
        }
      ]
    });

    await this.emailService.sendBulkNotificationEmails([
      {
        userId: policy.escrow.buyerId,
        title: "Recibimos tu reclamo del micro-seguro",
        body: `Tu reclamo para ${policy.escrow.listing.title} quedó registrado con motivo: ${dto.reason}.`,
        resourceType: "insurance_policy",
        resourceId: updated.id
      },
      {
        userId: policy.escrow.sellerId,
        title: "Hay un reclamo de seguro en una operación",
        body: `La operación de ${policy.escrow.listing.title} pasó a revisión de seguro.`,
        resourceType: "insurance_policy",
        resourceId: updated.id
      }
    ]);

    return updated;
  }

  async resolveClaim(
    id: string,
    dto: ResolveInsuranceClaimDto,
    actor: { sub: string; role: UserRole }
  ) {
    const policy = await this.getPolicyById(id);
    const previousPayload = this.asJsonObject(policy.rawPayload);
    const claim = this.readClaim(previousPayload);

    if (!claim) {
      throw new BadRequestException(
        "No existe un reclamo abierto para esta póliza."
      );
    }

    const nextStatus =
      dto.outcome === "REJECTED" ? "ACTIVE" : "CLAIMED";
    const updatedClaim = {
      ...claim,
      status: dto.outcome,
      updatedAt: new Date().toISOString(),
      resolution: {
        outcome: dto.outcome,
        notes: dto.resolutionNotes,
        decidedAt: new Date().toISOString(),
        decidedByUserId: actor.sub
      }
    } satisfies Prisma.JsonObject;

    const updated = await this.prisma.insurancePolicy.update({
      where: { id },
      data: {
        status: nextStatus,
        rawPayload: {
          ...previousPayload,
          claim: updatedClaim
        }
      }
    });

    await this.auditService.logAction({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: "INSURANCE_CLAIM_RESOLVED",
      resourceType: "insurance_policy",
      resourceId: id,
      metadata: {
        outcome: dto.outcome,
        escrowId: policy.escrowId,
        nextStatus,
        resolutionNotes: dto.resolutionNotes
      }
    });

    await this.prisma.userNotification.createMany({
      data: [
        {
          userId: policy.escrow.buyerId,
          type: NotificationType.PAYMENT_UPDATED,
          title:
            dto.outcome === "APPROVED"
              ? "Tu reclamo de seguro fue aprobado"
              : "Tu reclamo de seguro fue rechazado",
          body:
            dto.outcome === "APPROVED"
              ? `El reclamo de ${policy.escrow.listing.title} fue aprobado y queda en seguimiento operativo.`
              : `El reclamo de ${policy.escrow.listing.title} fue rechazado y la póliza vuelve a estado activo.`,
          resourceType: "insurance_policy",
          resourceId: updated.id
        },
        {
          userId: policy.escrow.sellerId,
          type: NotificationType.PAYMENT_UPDATED,
          title: "Se resolvió un reclamo de seguro",
          body: `La operación de ${policy.escrow.listing.title} tiene resolución de reclamo: ${dto.outcome}.`,
          resourceType: "insurance_policy",
          resourceId: updated.id
        }
      ]
    });

    await this.emailService.sendBulkNotificationEmails([
      {
        userId: policy.escrow.buyerId,
        title:
          dto.outcome === "APPROVED"
            ? "Reclamo de micro-seguro aprobado"
            : "Reclamo de micro-seguro rechazado",
        body:
          dto.outcome === "APPROVED"
            ? `Tu reclamo para ${policy.escrow.listing.title} fue aprobado.`
            : `Tu reclamo para ${policy.escrow.listing.title} fue rechazado.`,
        resourceType: "insurance_policy",
        resourceId: updated.id
      },
      {
        userId: policy.escrow.sellerId,
        title: "Reclamo de seguro resuelto",
        body: `Se resolvió el reclamo de seguro para ${policy.escrow.listing.title} con resultado ${dto.outcome}.`,
        resourceType: "insurance_policy",
        resourceId: updated.id
      }
    ]);

    return updated;
  }

  async getPolicyById(id: string) {
    const policy = await this.prisma.insurancePolicy.findUnique({
      where: { id },
      include: {
        provider: true,
        escrow: {
          include: {
            listing: true,
            buyer: true,
            seller: true,
            paymentIntents: {
              orderBy: {
                createdAt: "desc"
              }
            }
          }
        }
      }
    });

    if (!policy) {
      throw new NotFoundException(`Insurance policy ${id} not found`);
    }

    return policy;
  }

  async updatePolicyStatus(
    id: string,
    dto: UpdateInsurancePolicyStatusDto,
    actor: { sub: string; role: UserRole }
  ) {
    const policy = await this.getPolicyById(id);
    const updated = await this.prisma.insurancePolicy.update({
      where: { id },
      data: {
        status: dto.status,
        policyUrl: dto.policyUrl ?? policy.policyUrl
      }
    });

    await this.auditService.logAction({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: "INSURANCE_POLICY_STATUS_UPDATED",
      resourceType: "insurance_policy",
      resourceId: id,
      metadata: {
        previousStatus: policy.status,
        nextStatus: dto.status,
        policyUrl: updated.policyUrl
      }
    });

    return updated;
  }

  async prepareCheckoutInsurance(listingId: string, buyerId: string) {
    const quote = await this.getQuote({ productId: listingId }, buyerId);

    if (!quote.eligible) {
      throw new BadRequestException(
        quote.reason ?? "La operación no es elegible para seguro embebido."
      );
    }

    if (quote.requiresIdentityVerified) {
      throw new BadRequestException(
        "El seguro solo puede emitirse con identidad verificada."
      );
    }

    return quote;
  }

  async issuePolicyForEscrow(escrowId: string) {
    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id: escrowId },
      include: {
        listing: true,
        buyer: true,
        insurancePolicy: true
      }
    });

    if (!escrow) {
      throw new NotFoundException(`Escrow ${escrowId} not found`);
    }

    if (!escrow.isInsured) {
      return null;
    }

    if (escrow.insurancePolicy) {
      return escrow.insurancePolicy;
    }

    if (escrow.buyer.kycStatus !== "APPROVED") {
      throw new BadRequestException(
        "Insurance policy can only be issued for identity verified buyers."
      );
    }

    const provider = await this.getOrCreateDefaultProvider();
    const providerClient = this.getProviderClient(provider);
    const issueResult = await providerClient.issuePolicy({
      orderId: escrow.id,
      productTitle: escrow.listing.title,
      category: escrow.listing.category,
      insuredAmount: new Prisma.Decimal(escrow.amount),
      premiumAmount: new Prisma.Decimal(escrow.insuranceFee),
      buyer: {
        id: escrow.buyer.id,
        email: escrow.buyer.email,
        firstName: escrow.buyer.firstName,
        lastName: escrow.buyer.lastName,
        dni: escrow.buyer.dni,
        identityVerified: escrow.buyer.kycStatus === "APPROVED"
      }
    });

    const policy = await this.prisma.insurancePolicy.create({
      data: {
        escrowId: escrow.id,
        providerId: provider.id,
        externalPolicyId: issueResult.externalPolicyId,
        status: issueResult.status,
        premiumAmount: issueResult.premiumAmount,
        coverageAmount: issueResult.coverageAmount,
        policyUrl: issueResult.policyUrl,
        rawPayload: issueResult.rawPayload
      }
    });

    await this.auditService.logAction({
      actorUserId: escrow.buyerId,
      actorRole: UserRole.USER,
      action: "INSURANCE_POLICY_ISSUED",
      resourceType: "insurance_policy",
      resourceId: policy.id,
      metadata: {
        escrowId: escrow.id,
        provider: provider.name,
        premiumAmount: policy.premiumAmount.toString(),
        coverageAmount: policy.coverageAmount.toString(),
        status: policy.status
      }
    });

    await this.emailService.sendBulkNotificationEmails([
      {
        userId: escrow.buyerId,
        title: "Micro-seguro emitido",
        body: `Tu cobertura ya está activa para ${escrow.listing.title}.`,
        resourceType: "insurance_policy",
        resourceId: policy.id
      },
      {
        userId: escrow.sellerId,
        title: "Operación con seguro activo",
        body: `La operación de ${escrow.listing.title} ya tiene micro-seguro activo.`,
        resourceType: "insurance_policy",
        resourceId: policy.id
      }
    ]);

    return policy;
  }

  async processPolicyWebhook(
    providerName: string,
    dto: InsurancePolicyWebhookDto,
    headers: Record<string, string | string[] | undefined>,
    rawBody?: Buffer
  ) {
    const provider = await this.prisma.insuranceProvider.findUnique({
      where: { name: providerName }
    });

    if (!provider) {
      throw new NotFoundException(`Insurance provider ${providerName} not found`);
    }

    this.verifyWebhookSignature(provider.apiKey, headers, rawBody, dto);
    const providerClient = this.getProviderClient(provider);
    const normalized = providerClient.normalizeWebhook(
      dto.rawPayload ?? (dto as unknown as Record<string, unknown>)
    );

    if (!normalized.externalPolicyId && !normalized.orderId) {
      throw new BadRequestException(
        "Insurance webhook must include externalPolicyId or orderId"
      );
    }

    const policy = await this.prisma.insurancePolicy.findFirst({
      where: {
        OR: [
          normalized.externalPolicyId
            ? { externalPolicyId: normalized.externalPolicyId }
            : undefined,
          normalized.orderId ? { escrowId: normalized.orderId } : undefined
        ].filter(Boolean) as Prisma.InsurancePolicyWhereInput[]
      }
    });

    if (!policy) {
      throw new NotFoundException("Insurance policy not found");
    }

    const updated = await this.prisma.insurancePolicy.update({
      where: { id: policy.id },
      data: {
        status: normalized.status,
        policyUrl: normalized.policyUrl ?? policy.policyUrl,
        rawPayload: normalized.rawPayload
      }
    });

    return {
      received: true,
      policyId: updated.id,
      status: updated.status
    };
  }

  private async getOrCreateDefaultProvider() {
    return this.prisma.insuranceProvider.upsert({
      where: { name: "GenericInsurtech" },
      update: {
        endpointApi:
          process.env.INSURANCE_PROVIDER_ENDPOINT_API ??
          "https://api.generic-insurtech.example",
        apiKey:
          process.env.INSURANCE_PROVIDER_API_KEY ??
          "generic-insurtech-dev-key"
      },
      create: {
        name: "GenericInsurtech",
        endpointApi:
          process.env.INSURANCE_PROVIDER_ENDPOINT_API ??
          "https://api.generic-insurtech.example",
        apiKey:
          process.env.INSURANCE_PROVIDER_API_KEY ??
          "generic-insurtech-dev-key"
      }
    });
  }

  private getProviderClient(provider: {
    name: string;
    endpointApi: string;
    apiKey: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
  }): BaseInsuranceProvider {
    return new GenericInsurtechProvider(provider);
  }

  private verifyWebhookSignature(
    secret: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody?: Buffer,
    payload?: unknown
  ) {
    const signature = this.getHeader(headers, "x-lm-insurance-signature");

    if (!signature) {
      throw new UnauthorizedException("Missing insurance webhook signature");
    }

    const body = rawBody?.length
      ? rawBody
      : Buffer.from(JSON.stringify(payload ?? {}));
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException("Invalid insurance webhook signature");
    }
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  private asJsonObject(value: Prisma.JsonValue | null | undefined) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {} as Prisma.JsonObject;
    }

    return value as Prisma.JsonObject;
  }

  private readClaim(payload: Prisma.JsonObject) {
    const claim = payload.claim;

    if (!claim || typeof claim !== "object" || Array.isArray(claim)) {
      return null;
    }

    return claim as Prisma.JsonObject;
  }

  private parseEvidenceUrls(value?: string) {
    if (!value) {
      return [];
    }

    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10);
  }
}
