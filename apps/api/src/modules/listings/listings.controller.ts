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
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { CreateListingDto } from "./dto/create-listing.dto";
import { ListListingsQueryDto } from "./dto/list-listings-query.dto";
import { UpdateListingStatusDto } from "./dto/update-listing-status.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";
import { ListingsService } from "./listings.service";

@Controller("listings")
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly auditService: AuditService
  ) {}

  @Post()
  @RateLimit({ keyPrefix: "listing-create", limit: 20, windowSeconds: 3600 })
  @UseGuards(JwtAuthGuard, RolesGuard)
  createListing(
    @Body() dto: CreateListingDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    if (user.role === UserRole.USER && dto.sellerId !== user.sub) {
      throw new BadRequestException("Users can only create their own listings");
    }

    return this.listingsService.createListing(dto);
  }

  @Get()
  listListings(@Query() query: ListListingsQueryDto) {
    return this.listingsService.listListings(query);
  }

  @Get(":id")
  getListing(@Param("id") id: string) {
    return this.listingsService.getListingById(id);
  }

  @Patch(":id")
  @RateLimit({ keyPrefix: "listing-update", limit: 60, windowSeconds: 3600 })
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateListing(
    @Param("id") id: string,
    @Body() dto: UpdateListingDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    const current = await this.listingsService.getListingById(id);

    if (user.role === UserRole.USER && current.sellerId !== user.sub) {
      throw new BadRequestException("Users can only update their own listings");
    }

    const listing = await this.listingsService.updateListing(id, dto);

    await this.auditService.logAction({
      actorUserId: user.sub,
      actorRole: user.role,
      action: "LISTING_UPDATED",
      resourceType: "listing",
      resourceId: id,
      metadata: {
        status: dto.status
      }
    });

    return listing;
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPS)
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateListingStatusDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.listingsService.updateStatus(id, dto).then(async (listing) => {
      await this.auditService.logAction({
        actorUserId: user.sub,
        actorRole: user.role,
        action: "LISTING_STATUS_UPDATED",
        resourceType: "listing",
        resourceId: id,
        metadata: {
          status: dto.status
        }
      });

      return listing;
    });
  }
}
