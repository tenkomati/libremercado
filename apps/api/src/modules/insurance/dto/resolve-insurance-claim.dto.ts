import { IsEnum, IsString, Length } from "class-validator";

export class ResolveInsuranceClaimDto {
  @IsEnum(["APPROVED", "REJECTED"])
  outcome!: "APPROVED" | "REJECTED";

  @IsString()
  @Length(8, 2000)
  resolutionNotes!: string;
}
