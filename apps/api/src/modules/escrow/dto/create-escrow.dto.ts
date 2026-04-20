import { IsOptional, IsString, Length } from "class-validator";

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
}
