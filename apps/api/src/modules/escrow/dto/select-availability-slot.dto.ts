import { IsOptional, IsString, Length } from "class-validator";

export class SelectAvailabilitySlotDto {
  @IsOptional()
  @IsString()
  @Length(2, 800)
  note?: string;
}
