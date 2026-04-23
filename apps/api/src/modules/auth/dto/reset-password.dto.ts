import { IsString, Length, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  @Length(32, 300)
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
