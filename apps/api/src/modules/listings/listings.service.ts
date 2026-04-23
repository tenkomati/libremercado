import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { CurrencyCode, KycStatus, ListingStatus, Prisma } from "@prisma/client";

import {
  getPagination,
  getSafeSortBy,
  getSortOrder,
  makePaginationMeta
} from "../common/pagination";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

import { CreateListingDto } from "./dto/create-listing.dto";
import { ListListingsQueryDto } from "./dto/list-listings-query.dto";
import { UpdateListingStatusDto } from "./dto/update-listing-status.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly usersService: UsersService
  ) {}

  async createListing(dto: CreateListingDto) {
    const seller = await this.usersService.ensureExists(dto.sellerId);

    if (seller.status !== "ACTIVE") {
      throw new BadRequestException("Seller must be active");
    }

    if (seller.kycStatus !== KycStatus.APPROVED) {
      throw new BadRequestException("Seller must have approved KYC");
    }

    const initialStatus =
      dto.status && dto.status !== ListingStatus.PUBLISHED
        ? dto.status
        : ListingStatus.PUBLISHED;
    const currency = await this.getAllowedCurrency(dto.currency);

    return this.prisma.listing.create({
      data: {
        sellerId: dto.sellerId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        condition: dto.condition,
        price: new Prisma.Decimal(dto.price),
        currency,
        locationProvince: dto.locationProvince,
        locationCity: dto.locationCity,
        status: initialStatus,
        publishedAt:
          initialStatus === ListingStatus.PUBLISHED ? new Date() : undefined,
        images: dto.images?.length
          ? {
              create: dto.images.map((image, index) => ({
                url: image.url,
                sortOrder: index
              }))
            }
          : undefined
      },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc"
          }
        }
      }
    });
  }

  async listListings(query: ListListingsQueryDto) {
    const pagination = getPagination(query);
    const sortBy = getSafeSortBy(
      query.sortBy,
      ["createdAt", "updatedAt", "publishedAt", "price", "status", "title"] as const,
      "createdAt"
    );
    const where: Prisma.ListingWhereInput = {
      sellerId: query.sellerId,
      status: query.status,
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
              { category: { contains: query.q, mode: "insensitive" } },
              { locationCity: { contains: query.q, mode: "insensitive" } },
              { locationProvince: { contains: query.q, mode: "insensitive" } },
              {
                seller: {
                  OR: [
                    { firstName: { contains: query.q, mode: "insensitive" } },
                    { lastName: { contains: query.q, mode: "insensitive" } },
                    { email: { contains: query.q, mode: "insensitive" } }
                  ]
                }
              }
            ]
          }
        : {})
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        include: {
          images: {
            orderBy: {
              sortOrder: "asc"
            }
          },
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              city: true,
              province: true,
              reputationScore: true,
              kycStatus: true
            }
          },
          _count: {
            select: {
              escrows: true
            }
          }
        },
        orderBy: {
          [sortBy]: getSortOrder(query.sortOrder)
        },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.listing.count({ where })
    ]);

    return {
      items,
      meta: makePaginationMeta({
        page: pagination.page,
        pageSize: pagination.pageSize,
        total
      })
    };
  }

  async getListingById(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc"
          }
        },
        seller: true,
        escrows: {
          include: {
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${id} not found`);
    }

    return listing;
  }

  async updateStatus(id: string, dto: UpdateListingStatusDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id }
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${id} not found`);
    }

    return this.prisma.listing.update({
      where: { id },
      data: {
        status: dto.status,
        publishedAt:
          dto.status === ListingStatus.PUBLISHED && !listing.publishedAt
            ? new Date()
            : listing.publishedAt
      }
    });
  }

  async updateListing(id: string, dto: UpdateListingDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id }
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${id} not found`);
    }

    if (
      dto.status &&
      dto.status !== ListingStatus.PUBLISHED &&
      dto.status !== ListingStatus.PAUSED
    ) {
      throw new BadRequestException("Users can only publish or pause listings");
    }
    const currency =
      dto.currency !== undefined ? await this.getAllowedCurrency(dto.currency) : undefined;

    return this.prisma.$transaction(async (tx) => {
      if (dto.images) {
        await tx.listingImage.deleteMany({
          where: { listingId: id }
        });
      }

      return tx.listing.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          category: dto.category,
          condition: dto.condition,
          price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
          currency,
          locationProvince: dto.locationProvince,
          locationCity: dto.locationCity,
          status: dto.status,
          publishedAt:
            dto.status === ListingStatus.PUBLISHED && !listing.publishedAt
              ? new Date()
              : listing.publishedAt,
          images: dto.images
            ? {
                create: dto.images.map((image, index) => ({
                  url: image.url,
                  sortOrder: index
                }))
              }
            : undefined
        },
        include: {
          images: {
            orderBy: {
              sortOrder: "asc"
            }
          }
        }
      });
    });
  }

  private async getAllowedCurrency(currency?: CurrencyCode) {
    const settings = await this.platformSettingsService.getSettings();
    const selectedCurrency = currency ?? settings.defaultCurrency;

    if (selectedCurrency === CurrencyCode.USD && !settings.allowUsdListings) {
      throw new BadRequestException("USD listings are disabled");
    }

    return selectedCurrency;
  }
}
