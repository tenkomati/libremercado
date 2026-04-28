import { IsOptional, IsString, Length } from "class-validator";

export class SearchCatalogDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  query?: string;

  @IsOptional()
  @IsString()
  @Length(5, 1000)
  referenceImageUrl?: string;
}
