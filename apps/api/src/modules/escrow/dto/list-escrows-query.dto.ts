import { EscrowStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/pagination-query.dto";

export class ListEscrowsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsEnum(EscrowStatus)
  status?: EscrowStatus;
}
