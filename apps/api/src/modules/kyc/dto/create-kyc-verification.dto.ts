import { KycDocumentType } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateKycVerificationDto {
  @IsString()
  userId!: string;

  @IsString()
  @Length(2, 60)
  provider!: string;

  @IsEnum(KycDocumentType)
  documentType!: KycDocumentType;

  @IsString()
  @Length(7, 20)
  documentNumber!: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  reviewerNotes?: string;

  @IsOptional()
  @IsString()
  @Length(1, 300)
  @Matches(/^\/uploads\/kyc\/.+/)
  documentFrontImageUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 300)
  @Matches(/^\/uploads\/kyc\/.+/)
  documentBackImageUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 300)
  @Matches(/^\/uploads\/kyc\/.+/)
  selfieImageUrl?: string;

  @IsOptional()
  @IsDateString()
  biometricConsentAt?: string;
}
