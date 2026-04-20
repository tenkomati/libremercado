import { IsString, Length } from "class-validator";

export class MarkEscrowShippedDto {
  @IsString()
  @Length(2, 120)
  trackingCode!: string;
}
