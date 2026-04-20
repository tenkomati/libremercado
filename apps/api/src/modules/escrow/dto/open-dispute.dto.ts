import { IsString, Length } from "class-validator";

export class OpenDisputeDto {
  @IsString()
  @Length(10, 1000)
  reason!: string;
}
