import { IsString, Length } from "class-validator";

export class CreateEscrowMessageDto {
  @IsString()
  @Length(2, 800)
  body!: string;
}
