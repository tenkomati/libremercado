import { Injectable } from "@nestjs/common";
import { CurrencyCode, Prisma, UserRole } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import { UpdatePlatformSettingsDto } from "./dto/update-platform-settings.dto";

const GLOBAL_SETTINGS_ID = "global";

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async getSettings() {
    return this.prisma.platformSettings.upsert({
      where: { id: GLOBAL_SETTINGS_ID },
      update: {},
      create: {
        id: GLOBAL_SETTINGS_ID,
        sellerCommissionPercentage: new Prisma.Decimal("5"),
        buyerCommissionPercentage: new Prisma.Decimal("0"),
        fixedListingFee: new Prisma.Decimal("0"),
        fixedTransactionFee: new Prisma.Decimal("0"),
        defaultCurrency: CurrencyCode.ARS,
        allowUsdListings: true
      }
    });
  }

  async updateSettings(
    dto: UpdatePlatformSettingsDto,
    actor: { sub: string; role: UserRole }
  ) {
    const settings = await this.prisma.platformSettings.upsert({
      where: { id: GLOBAL_SETTINGS_ID },
      update: {
        sellerCommissionPercentage:
          dto.sellerCommissionPercentage !== undefined
            ? new Prisma.Decimal(dto.sellerCommissionPercentage)
            : undefined,
        buyerCommissionPercentage:
          dto.buyerCommissionPercentage !== undefined
            ? new Prisma.Decimal(dto.buyerCommissionPercentage)
            : undefined,
        fixedListingFee:
          dto.fixedListingFee !== undefined
            ? new Prisma.Decimal(dto.fixedListingFee)
            : undefined,
        fixedTransactionFee:
          dto.fixedTransactionFee !== undefined
            ? new Prisma.Decimal(dto.fixedTransactionFee)
            : undefined,
        defaultCurrency: dto.defaultCurrency,
        allowUsdListings: dto.allowUsdListings,
        updatedByUserId: actor.sub
      },
      create: {
        id: GLOBAL_SETTINGS_ID,
        sellerCommissionPercentage: new Prisma.Decimal(
          dto.sellerCommissionPercentage ?? 5
        ),
        buyerCommissionPercentage: new Prisma.Decimal(
          dto.buyerCommissionPercentage ?? 0
        ),
        fixedListingFee: new Prisma.Decimal(dto.fixedListingFee ?? 0),
        fixedTransactionFee: new Prisma.Decimal(dto.fixedTransactionFee ?? 0),
        defaultCurrency: dto.defaultCurrency ?? CurrencyCode.ARS,
        allowUsdListings: dto.allowUsdListings ?? true,
        updatedByUserId: actor.sub
      }
    });

    await this.auditService.logAction({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: "PLATFORM_SETTINGS_UPDATED",
      resourceType: "platform_settings",
      resourceId: GLOBAL_SETTINGS_ID,
      metadata: {
        sellerCommissionPercentage: settings.sellerCommissionPercentage.toString(),
        buyerCommissionPercentage: settings.buyerCommissionPercentage.toString(),
        fixedListingFee: settings.fixedListingFee.toString(),
        fixedTransactionFee: settings.fixedTransactionFee.toString(),
        defaultCurrency: settings.defaultCurrency,
        allowUsdListings: settings.allowUsdListings
      }
    });

    return settings;
  }
}
