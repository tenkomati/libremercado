import { KycDocumentType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

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
}
