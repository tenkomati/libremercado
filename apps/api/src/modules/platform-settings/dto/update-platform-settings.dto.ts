import { CurrencyCode } from "@prisma/client";
import { IsBoolean, IsEnum, IsNumber, IsOptional, Max, Min } from "class-validator";

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(30)
  sellerCommissionPercentage?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(30)
  buyerCommissionPercentage?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedListingFee?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedTransactionFee?: number;

  @IsOptional()
  @IsEnum(CurrencyCode)
  defaultCurrency?: CurrencyCode;

  @IsOptional()
  @IsBoolean()
  allowUsdListings?: boolean;
}
