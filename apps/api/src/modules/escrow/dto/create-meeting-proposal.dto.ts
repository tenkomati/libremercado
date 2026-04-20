import { FuelStationBrand } from "@prisma/client";
import { IsDateString, IsEnum, IsString, Length } from "class-validator";

export class CreateMeetingProposalDto {
  @IsEnum(FuelStationBrand)
  brand!: FuelStationBrand;

  @IsString()
  @Length(2, 120)
  stationName!: string;

  @IsString()
  @Length(4, 180)
  address!: string;

  @IsString()
  @Length(2, 80)
  city!: string;

  @IsString()
  @Length(2, 80)
  province!: string;

  @IsDateString()
  proposedAt!: string;
}
