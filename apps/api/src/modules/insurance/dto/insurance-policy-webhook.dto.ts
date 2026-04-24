import { InsurancePolicyStatus } from "@prisma/client";
import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";

export class InsurancePolicyWebhookDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  externalPolicyId?: string;

  @IsEnum(InsurancePolicyStatus)
  status!: InsurancePolicyStatus;

  @IsOptional()
  @IsString()
  policyUrl?: string;

  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;
}
