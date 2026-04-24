import { IsOptional, IsString, Length } from "class-validator";

export class CreateInsuranceClaimDto {
  @IsString()
  @Length(3, 80)
  reason!: string;

  @IsString()
  @Length(10, 2000)
  details!: string;

  @IsOptional()
  @IsString()
  @Length(6, 40)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 3000)
  evidenceUrls?: string;
}
