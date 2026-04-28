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
import { PublishListingDraftDto } from "./dto/publish-listing-draft.dto";
import { SearchCatalogDto } from "./dto/search-catalog.dto";
import { UpdateListingDraftDto } from "./dto/update-listing-draft.dto";
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

  @Post("catalog/search")
  @RateLimit({ keyPrefix: "listing-catalog-search", limit: 120, windowSeconds: 3600 })
  searchCatalog(@Body() dto: SearchCatalogDto) {
    return this.listingsService.searchCatalog(dto);
  }

  @Get("drafts/active")
  @UseGuards(JwtAuthGuard, RolesGuard)
  getActiveDraft(@CurrentUser() user: { sub: string }) {
    return this.listingsService.getOrCreateActiveDraft(user.sub);
  }

  @Get("drafts/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  getDraft(
    @Param("id") id: string,
    @CurrentUser() user: { sub: string }
  ) {
    return this.listingsService.getDraftById(id, user.sub);
  }

  @Patch("drafts/:id")
  @RateLimit({ keyPrefix: "listing-draft-update", limit: 200, windowSeconds: 3600 })
  @UseGuards(JwtAuthGuard, RolesGuard)
  updateDraft(
    @Param("id") id: string,
    @Body() dto: UpdateListingDraftDto,
    @CurrentUser() user: { sub: string }
  ) {
    return this.listingsService.updateDraft(id, user.sub, dto);
  }

  @Post("drafts/:id/publish")
  @RateLimit({ keyPrefix: "listing-draft-publish", limit: 20, windowSeconds: 3600 })
  @UseGuards(JwtAuthGuard, RolesGuard)
  publishDraft(
    @Param("id") id: string,
    @Body() dto: PublishListingDraftDto,
    @CurrentUser() user: { sub: string }
  ) {
    return this.listingsService.publishDraft(id, user.sub, dto);
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
