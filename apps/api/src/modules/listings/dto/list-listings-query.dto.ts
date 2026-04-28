import { ListingStatus } from "@prisma/client";
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
