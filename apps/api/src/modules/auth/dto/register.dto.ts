import {
  Equals,
  IsEmail,
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength
} from "class-validator";

const UPLOADED_KYC_IMAGE_URL_PATTERN = /^(\/uploads\/kyc\/.+|https:\/\/.+\/uploads\/kyc\/.+)/;

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(7, 20)
  dni!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @Length(2, 80)
  firstName!: string;

  @IsString()
  @Length(2, 80)
  lastName!: string;

  @IsOptional()
  @IsString()
  @Length(6, 30)
  phone?: string;

  @IsString()
  @Length(2, 80)
  province!: string;

  @IsString()
  @Length(2, 80)
  city!: string;

  @IsString()
  @Length(1, 1000)
  @Matches(UPLOADED_KYC_IMAGE_URL_PATTERN)
  documentFrontImageUrl!: string;

  @IsString()
  @Length(1, 1000)
  @Matches(UPLOADED_KYC_IMAGE_URL_PATTERN)
  documentBackImageUrl!: string;

  @IsString()
  @Length(1, 1000)
  @Matches(UPLOADED_KYC_IMAGE_URL_PATTERN)
  selfieImageUrl!: string;

  @IsBoolean()
  @Equals(true)
  identityVerificationConsent!: boolean;
}
