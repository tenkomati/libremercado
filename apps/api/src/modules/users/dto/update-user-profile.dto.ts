import { IsOptional, IsString, Length } from "class-validator";

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(6, 30)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  province?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  city?: string;
}
