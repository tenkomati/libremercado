import { InsurancePolicyStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

export class UpdateInsurancePolicyStatusDto {
  @IsEnum(InsurancePolicyStatus)
  status!: InsurancePolicyStatus;

  @IsOptional()
  @IsString()
  @Length(5, 1000)
  policyUrl?: string;
}
