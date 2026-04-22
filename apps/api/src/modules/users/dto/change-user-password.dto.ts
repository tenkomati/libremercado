import { IsString, Length } from "class-validator";

export class ChangeUserPasswordDto {
  @IsString()
  @Length(8, 255)
  currentPassword!: string;

  @IsString()
  @Length(8, 255)
  newPassword!: string;
}
