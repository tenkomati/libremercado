import { InsurancePolicyStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/pagination-query.dto";

export class ListInsurancePoliciesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InsurancePolicyStatus)
  status?: InsurancePolicyStatus;

  @IsOptional()
  @IsString()
  providerName?: string;
}
