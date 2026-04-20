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

class ListingImageDto {
  @IsString()
  @Length(5, 500)
  url!: string;
}

export class CreateListingDto {
  @IsString()
  sellerId!: string;

  @IsString()
  @Length(5, 120)
  title!: string;

  @IsString()
  @Length(20, 4000)
  description!: string;

  @IsString()
  @Length(2, 120)
  category!: string;

  @IsEnum(ListingCondition)
  condition!: ListingCondition;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  price!: number;

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsString()
  @Length(2, 80)
  locationProvince!: string;

  @IsString()
  @Length(2, 80)
  locationCity!: string;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ListingImageDto)
  images?: ListingImageDto[];
}
