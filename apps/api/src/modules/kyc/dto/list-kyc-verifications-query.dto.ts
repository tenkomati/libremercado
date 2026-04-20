import { KycStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/pagination-query.dto";

export class ListKycVerificationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(KycStatus)
  status?: KycStatus;
}
