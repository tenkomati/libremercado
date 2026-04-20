import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

import { CreateEscrowDto } from "./dto/create-escrow.dto";
import { ListEscrowsQueryDto } from "./dto/list-escrows-query.dto";
import { MarkEscrowShippedDto } from "./dto/mark-escrow-shipped.dto";
import { OpenDisputeDto } from "./dto/open-dispute.dto";
import { EscrowService } from "./escrow.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("escrows")
export class EscrowController {
  constructor(
    private readonly escrowService: EscrowService,
    private readonly auditService: AuditService
  ) {}

  @Post()
  createEscrow(
    @Body() dto: CreateEscrowDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    if (user.role === UserRole.USER && dto.buyerId !== user.sub) {
      throw new BadRequestException("Users can only create their own escrows");
    }

    return this.escrowService.createEscrow(dto).then(async (escrow) => {
      await this.auditService.logAction({
        actorUserId: user.sub,
        actorRole: user.role,
        action: "ESCROW_CREATED",
        resourceType: "escrow",
        resourceId: escrow.id,
        metadata: {
          listingId: dto.listingId,
          buyerId: dto.buyerId
        }
      });

      return escrow;
    });
  }

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Get()
  listEscrows(@Query() query: ListEscrowsQueryDto) {
    return this.escrowService.listEscrows(query);
  }

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Get(":id")
  getEscrow(@Param("id") id: string) {
    return this.escrowService.getEscrowById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Patch(":id/ship")
  markShipped(
    @Param("id") id: string,
    @Body() dto: MarkEscrowShippedDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.escrowService.markShipped(id, dto).then(async (escrow) => {
      await this.auditService.logAction({
        actorUserId: user.sub,
        actorRole: user.role,
        action: "ESCROW_SHIPPED",
        resourceType: "escrow",
        resourceId: id,
        metadata: {
          trackingCode: dto.trackingCode
        }
      });

      return escrow;
    });
  }

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Patch(":id/confirm-delivery")
  confirmDelivery(
    @Param("id") id: string,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.escrowService.confirmDelivery(id).then(async (escrow) => {
      await this.auditService.logAction({
        actorUserId: user.sub,
        actorRole: user.role,
        action: "ESCROW_DELIVERY_CONFIRMED",
        resourceType: "escrow",
        resourceId: id
      });

      return escrow;
    });
  }

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Patch(":id/release")
  releaseFunds(
    @Param("id") id: string,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.escrowService.releaseFunds(id).then(async (escrow) => {
      await this.auditService.logAction({
        actorUserId: user.sub,
        actorRole: user.role,
        action: "ESCROW_FUNDS_RELEASED",
        resourceType: "escrow",
        resourceId: id
      });

      return escrow;
    });
  }

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Patch(":id/dispute")
  openDispute(
    @Param("id") id: string,
    @Body() dto: OpenDisputeDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.escrowService.openDispute(id, dto).then(async (escrow) => {
      await this.auditService.logAction({
        actorUserId: user.sub,
        actorRole: user.role,
        action: "ESCROW_DISPUTE_OPENED",
        resourceType: "escrow",
        resourceId: id,
        metadata: {
          reason: dto.reason
        }
      });

      return escrow;
    });
  }
}
