import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Param,
  UseGuards
} from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

import { CreateKycVerificationDto } from "./dto/create-kyc-verification.dto";
import { ListKycVerificationsQueryDto } from "./dto/list-kyc-verifications-query.dto";
import { ReviewKycVerificationDto } from "./dto/review-kyc-verification.dto";
import { KycService } from "./kyc.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("kyc")
export class KycController {
  constructor(
    private readonly kycService: KycService,
    private readonly auditService: AuditService
  ) {}

  @Post("verifications")
  createVerification(
    @Body() dto: CreateKycVerificationDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    if (user.role === UserRole.USER && dto.userId !== user.sub) {
      throw new BadRequestException("Users can only start their own KYC");
    }

    return this.kycService.createVerification(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Get("verifications")
  listVerifications(@Query() query: ListKycVerificationsQueryDto) {
    return this.kycService.listVerifications(query);
  }

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Patch("verifications/:id/review")
  reviewVerification(
    @Param("id") id: string,
    @Body() dto: ReviewKycVerificationDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.kycService.reviewVerification(id, dto).then(async (verification) => {
      await this.auditService.logAction({
        actorUserId: user.sub,
        actorRole: user.role,
        action: "KYC_REVIEWED",
        resourceType: "kyc_verification",
        resourceId: id,
        metadata: {
          status: dto.status
        }
      });

      return verification;
    });
  }
}
