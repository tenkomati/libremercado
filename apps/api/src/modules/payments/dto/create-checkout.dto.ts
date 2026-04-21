import { IsOptional, IsString, Length } from "class-validator";

export class CreateCheckoutDto {
  @IsString()
  listingId!: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  shippingProvider?: string;
}
