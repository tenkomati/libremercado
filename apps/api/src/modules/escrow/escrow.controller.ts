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

import { CreateAvailabilitySlotDto } from "./dto/create-availability-slot.dto";
import { CreateDeliveryProposalDto } from "./dto/create-delivery-proposal.dto";
import { CreateEscrowMessageDto } from "./dto/create-escrow-message.dto";
import { CreateEscrowDto } from "./dto/create-escrow.dto";
import { CreateMeetingProposalDto } from "./dto/create-meeting-proposal.dto";
import { ListEscrowsQueryDto } from "./dto/list-escrows-query.dto";
import { MarkEscrowShippedDto } from "./dto/mark-escrow-shipped.dto";
import { OpenDisputeDto } from "./dto/open-dispute.dto";
import { RespondDeliveryProposalDto } from "./dto/respond-delivery-proposal.dto";
import { RespondMeetingProposalDto } from "./dto/respond-meeting-proposal.dto";
import { SelectAvailabilitySlotDto } from "./dto/select-availability-slot.dto";
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

  @Get(":id/meeting-suggestions")
  getMeetingSuggestions(
    @Param("id") id: string,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.escrowService.getMeetingSuggestions(id, user);
  }

  @Post(":id/meeting-proposals")
  createMeetingProposal(
    @Param("id") id: string,
    @Body() dto: CreateMeetingProposalDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.escrowService.createMeetingProposal(id, dto, user).then(async (proposal) => {
      await this.auditService.logAction({
        actorUserId: user.sub,
        actorRole: user.role,
        action: "ESCROW_MEETING_PROPOSED",
        resourceType: "escrow",
        resourceId: id,
        metadata: {
          proposalId: proposal.id,
          brand: proposal.brand,
          proposedAt: proposal.proposedAt.toISOString()
        }
      });

      return proposal;
    });
  }

  @Patch(":id/meeting-proposals/:proposalId/respond")
  respondMeetingProposal(
    @Param("id") id: string,
    @Param("proposalId") proposalId: string,
    @Body() dto: RespondMeetingProposalDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.escrowService
      .respondMeetingProposal(id, proposalId, dto, user)
      .then(async (proposal) => {
        await this.auditService.logAction({
          actorUserId: user.sub,
          actorRole: user.role,
          action: "ESCROW_MEETING_RESPONDED",
          resourceType: "escrow",
          resourceId: id,
          metadata: {
            proposalId,
            status: proposal.status
          }
        });

        return proposal;
      });
  }

  @Post(":id/delivery-proposals")
  createDeliveryProposal(
    @Param("id") id: string,
    @Body() dto: CreateDeliveryProposalDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.escrowService.createDeliveryProposal(id, dto, user).then(async (proposal) => {
      await this.auditService.logAction({
        actorUserId: user.sub,
        actorRole: user.role,
        action: "ESCROW_DELIVERY_PROPOSED",
        resourceType: "escrow",
        resourceId: id,
        metadata: {
          proposalId: proposal.id,
          method: proposal.method
        }
      });

      return proposal;
    });
  }

  @Patch(":id/delivery-proposals/:proposalId/respond")
  respondDeliveryProposal(
    @Param("id") id: string,
    @Param("proposalId") proposalId: string,
    @Body() dto: RespondDeliveryProposalDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.escrowService
      .respondDeliveryProposal(id, proposalId, dto, user)
      .then(async (proposal) => {
        await this.auditService.logAction({
          actorUserId: user.sub,
          actorRole: user.role,
          action: "ESCROW_DELIVERY_RESPONDED",
          resourceType: "escrow",
          resourceId: id,
          metadata: {
            proposalId,
            status: proposal.status
          }
        });

        return proposal;
      });
  }

  @Post(":id/availability-slots")
  createAvailabilitySlot(
    @Param("id") id: string,
    @Body() dto: CreateAvailabilitySlotDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.escrowService.createAvailabilitySlot(id, dto, user).then(async (slot) => {
      await this.auditService.logAction({
        actorUserId: user.sub,
        actorRole: user.role,
        action: "ESCROW_AVAILABILITY_ADDED",
        resourceType: "escrow",
        resourceId: id,
        metadata: {
          slotId: slot.id,
          startsAt: slot.startsAt.toISOString(),
          endsAt: slot.endsAt.toISOString()
        }
      });

      return slot;
    });
  }

  @Patch(":id/availability-slots/:slotId/select")
  selectAvailabilitySlot(
    @Param("id") id: string,
    @Param("slotId") slotId: string,
    @Body() dto: SelectAvailabilitySlotDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.escrowService
      .selectAvailabilitySlot(id, slotId, dto, user)
      .then(async (slot) => {
        await this.auditService.logAction({
          actorUserId: user.sub,
          actorRole: user.role,
          action: "ESCROW_AVAILABILITY_SELECTED",
          resourceType: "escrow",
          resourceId: id,
          metadata: {
            slotId: slot.id,
            startsAt: slot.startsAt.toISOString()
          }
        });

        return slot;
      });
  }

  @Post(":id/messages")
  sendMessage(
    @Param("id") id: string,
    @Body() dto: CreateEscrowMessageDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.escrowService.sendMessage(id, dto, user).then(async (message) => {
      await this.auditService.logAction({
        actorUserId: user.sub,
        actorRole: user.role,
        action: "ESCROW_MESSAGE_SENT",
        resourceType: "escrow",
        resourceId: id,
        metadata: {
          messageId: message.id
        }
      });

      return message;
    });
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
