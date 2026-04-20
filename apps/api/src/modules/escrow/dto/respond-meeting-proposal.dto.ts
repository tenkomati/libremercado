import { MeetingProposalStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

export class RespondMeetingProposalDto {
  @IsEnum(MeetingProposalStatus)
  status!: MeetingProposalStatus;

  @IsOptional()
  @IsString()
  @Length(2, 500)
  responseNote?: string;
}
