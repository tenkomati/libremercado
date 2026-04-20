import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MinLength
} from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(7, 20)
  dni!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @Length(2, 80)
  firstName!: string;

  @IsString()
  @Length(2, 80)
  lastName!: string;

  @IsOptional()
  @IsString()
  @Length(6, 30)
  phone?: string;

  @IsString()
  @Length(2, 80)
  province!: string;

  @IsString()
  @Length(2, 80)
  city!: string;
}
