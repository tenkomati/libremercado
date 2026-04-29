import { CurrencyCode, ListingCondition, ListingStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";

import { PaginationQueryDto } from "../../common/pagination-query.dto";

export class ListListingsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  specKey?: string;

  @IsOptional()
  @IsString()
  specValue?: string;

  @IsOptional()
  @IsString()
  shutterCount?: string;

  @IsOptional()
  @IsString()
  batteryHealth?: string;

  @IsOptional()
  @IsString()
  storage?: string;

  @IsOptional()
  @IsString()
  memory?: string;

  @IsOptional()
  @IsString()
  wheelSize?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;
}
