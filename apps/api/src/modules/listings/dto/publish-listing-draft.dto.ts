import { IsOptional, IsString, Length } from "class-validator";

export class PublishListingDraftDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  locationProvince?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  locationCity?: string;
}
