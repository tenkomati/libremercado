import { CurrencyCode, DeliveryMethod, ListingCondition, ListingDraftStep } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested
} from "class-validator";

class DraftMediaDto {
  @IsString()
  @Length(5, 1000)
  url!: string;

  @IsIn(["IMAGE", "VIDEO"])
  type!: "IMAGE" | "VIDEO";
}

export class UpdateListingDraftDto {
  @IsOptional()
  @IsEnum(ListingDraftStep)
  currentStep?: ListingDraftStep;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  searchQuery?: string;

  @IsOptional()
  @IsString()
  @Length(5, 1000)
  referenceImageUrl?: string;

  @IsOptional()
  @IsString()
  matchedCatalogProductId?: string | null;

  @IsOptional()
  @IsString()
  @Length(3, 160)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  brand?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  model?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1980)
  @Max(2100)
  manufactureYear?: number;

  @IsOptional()
  @IsString()
  @Length(20, 4000)
  description?: string;

  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @IsOptional()
  @IsString()
  @Length(3, 120)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @Length(8, 40)
  imei?: string;

  @IsOptional()
  @IsBoolean()
  invoiceVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  insuranceSelected?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  targetNetAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  askingPrice?: number;

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shippingFeeEstimate?: number;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  locationProvince?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  locationCity?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsEnum(DeliveryMethod, { each: true })
  deliveryMethods?: DeliveryMethod[];

  @IsOptional()
  @IsObject()
  technicalSpecs?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => DraftMediaDto)
  media?: DraftMediaDto[];
}
