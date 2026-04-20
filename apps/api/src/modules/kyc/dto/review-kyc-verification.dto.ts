import { KycStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

export class ReviewKycVerificationDto {
  @IsEnum(KycStatus)
  status!: KycStatus;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  reviewerNotes?: string;
}
