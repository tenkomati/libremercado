import { DeliveryMethod } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

export class CreateDeliveryProposalDto {
  @IsEnum(DeliveryMethod)
  method!: DeliveryMethod;

  @IsOptional()
  @IsString()
  @Length(2, 500)
  details?: string;
}
