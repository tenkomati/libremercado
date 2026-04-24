import { IsBoolean, IsNumber, IsOptional, IsString, Length, Min } from "class-validator";

export class CreateEscrowDto {
  @IsString()
  listingId!: string;

  @IsString()
  buyerId!: string;

  @IsString()
  @Length(2, 80)
  shippingProvider!: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  shippingTrackingCode?: string;

  @IsOptional()
  @IsBoolean()
  isInsured?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  insuranceFee?: number;
}
