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
  @Length(1, 300)
  @Matches(/^\/uploads\/kyc\/.+/)
  documentFrontImageUrl!: string;

  @IsString()
  @Length(1, 300)
  @Matches(/^\/uploads\/kyc\/.+/)
  documentBackImageUrl!: string;

  @IsString()
  @Length(1, 300)
  @Matches(/^\/uploads\/kyc\/.+/)
  selfieImageUrl!: string;

  @IsBoolean()
  @Equals(true)
  identityVerificationConsent!: boolean;
}
