import { UserRole, UserStatus } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional, IsString, Length } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(7, 20)
  dni!: string;

  @IsString()
  @Length(8, 255)
  passwordHash!: string;

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

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
