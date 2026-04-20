import { ListingStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/pagination-query.dto";

export class ListListingsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;
}
