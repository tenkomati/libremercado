import { IsOptional, IsString, Length } from "class-validator";

export class CancelEscrowDto {
  @IsOptional()
  @IsString()
  @Length(5, 1000)
  reason?: string;
}
