import { IsOptional, IsString, Length } from "class-validator";

export class MarkEscrowShippedDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  trackingCode?: string;
}
