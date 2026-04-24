import { createHmac, timingSafeEqual } from "node:crypto";

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";
import { ListingsService } from "../listings/listings.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

import { GetInsuranceQuoteDto } from "./dto/get-insurance-quote.dto";
import { InsurancePolicyWebhookDto } from "./dto/insurance-policy-webhook.dto";
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
}
