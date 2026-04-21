import { KycDocumentType } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, Length, Matches } from "class-validator";

const UPLOADED_KYC_IMAGE_URL_PATTERN = /^(\/uploads\/kyc\/.+|https:\/\/.+\/uploads\/kyc\/.+)/;

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
  @Length(1, 1000)
  @Matches(UPLOADED_KYC_IMAGE_URL_PATTERN)
  documentFrontImageUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  @Matches(UPLOADED_KYC_IMAGE_URL_PATTERN)
  documentBackImageUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  @Matches(UPLOADED_KYC_IMAGE_URL_PATTERN)
  selfieImageUrl?: string;

  @IsOptional()
  @IsDateString()
  biometricConsentAt?: string;
}
