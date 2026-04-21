import { DeliveryProposalStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

export class RespondDeliveryProposalDto {
  @IsEnum(DeliveryProposalStatus)
  status!: DeliveryProposalStatus;

  @IsOptional()
  @IsString()
  @Length(2, 500)
  responseNote?: string;
}
