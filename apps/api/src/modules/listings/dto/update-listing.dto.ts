import { CurrencyCode, ListingCondition, ListingStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested
} from "class-validator";

class UpdateListingImageDto {
  @IsString()
  @Length(5, 500)
  url!: string;
}

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  @Length(5, 120)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(20, 4000)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  category?: string;

  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  price?: number;

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  locationProvince?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  locationCity?: string;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => UpdateListingImageDto)
  images?: UpdateListingImageDto[];
}
