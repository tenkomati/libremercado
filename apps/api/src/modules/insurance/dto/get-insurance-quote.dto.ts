import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class GetInsuranceQuoteDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  price?: number;
}
