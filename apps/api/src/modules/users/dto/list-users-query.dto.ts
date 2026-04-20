import { KycStatus, UserRole, UserStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

import { PaginationQueryDto } from "../../common/pagination-query.dto";

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus?: KycStatus;
}
