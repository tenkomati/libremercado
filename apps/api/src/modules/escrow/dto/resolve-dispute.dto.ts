import { IsEnum, IsString, Length } from "class-validator";

export enum DisputeResolutionOutcome {
  BUYER_REFUND = "BUYER_REFUND",
  SELLER_RELEASE = "SELLER_RELEASE"
}

export class ResolveDisputeDto {
  @IsEnum(DisputeResolutionOutcome)
  outcome!: DisputeResolutionOutcome;

  @IsString()
  @Length(10, 1000)
  reason!: string;
}
