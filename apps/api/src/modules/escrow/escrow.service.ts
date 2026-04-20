import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  EscrowEventType,
  EscrowStatus,
  KycStatus,
  ListingStatus,
  Prisma
} from "@prisma/client";

import {
  getPagination,
  getSafeSortBy,
  getSortOrder,
  makePaginationMeta
} from "../common/pagination";
import { ListingsService } from "../listings/listings.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

import { CreateEscrowDto } from "./dto/create-escrow.dto";
import { ListEscrowsQueryDto } from "./dto/list-escrows-query.dto";
import { MarkEscrowShippedDto } from "./dto/mark-escrow-shipped.dto";
import { OpenDisputeDto } from "./dto/open-dispute.dto";

@Injectable()
export class EscrowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly listingsService: ListingsService
  ) {}

  async createEscrow(dto: CreateEscrowDto) {
    const listing = await this.listingsService.getListingById(dto.listingId);
    const buyer = await this.usersService.ensureExists(dto.buyerId);

    if (buyer.status !== "ACTIVE" || buyer.kycStatus !== KycStatus.APPROVED) {
      throw new BadRequestException("Buyer must be active and KYC approved");
    }

    if (
      listing.seller.status !== "ACTIVE" ||
      listing.seller.kycStatus !== KycStatus.APPROVED
    ) {
      throw new BadRequestException("Seller must be active and KYC approved");
    }

    if (listing.status !== ListingStatus.PUBLISHED) {
      throw new BadRequestException("Listing is not available for purchase");
    }

    if (listing.sellerId === dto.buyerId) {
      throw new BadRequestException("Seller cannot buy their own listing");
    }

    const feePercentage = new Prisma.Decimal(
      process.env.DEFAULT_ESCROW_FEE_PERCENTAGE ?? "4"
    );
    const amount = new Prisma.Decimal(listing.price);
    const feeAmount = amount.mul(feePercentage).div(100);
    const netAmount = amount.sub(feeAmount);

    return this.prisma.$transaction(async (tx) => {
      const escrow = await tx.escrowTransaction.create({
        data: {
          listingId: dto.listingId,
          buyerId: dto.buyerId,
          sellerId: listing.sellerId,
          amount,
          feePercentage,
          feeAmount,
          netAmount,
          currency: listing.currency,
          status: EscrowStatus.FUNDS_HELD,
          shippingProvider: dto.shippingProvider,
          shippingTrackingCode: dto.shippingTrackingCode,
          events: {
            create: [
              {
                type: EscrowEventType.CREATED,
                payload: {
                  listingId: dto.listingId,
                  buyerId: dto.buyerId
                }
              },
              {
                type: EscrowEventType.FUNDS_HELD,
                payload: {
                  amount: amount.toString()
                }
              }
            ]
          }
        },
        include: {
          events: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      await tx.listing.update({
        where: { id: dto.listingId },
        data: {
          status: ListingStatus.RESERVED
        }
      });

      return escrow;
    });
  }

  async listEscrows(query: ListEscrowsQueryDto) {
    const pagination = getPagination(query);
    const sortBy = getSafeSortBy(
      query.sortBy,
      ["createdAt", "updatedAt", "amount", "status", "releasedAt", "deliveredAt"] as const,
      "createdAt"
    );
    const where: Prisma.EscrowTransactionWhereInput = {
      buyerId: query.buyerId,
      sellerId: query.sellerId,
      status: query.status,
      ...(query.q
        ? {
            OR: [
              { shippingProvider: { contains: query.q, mode: "insensitive" } },
              { shippingTrackingCode: { contains: query.q, mode: "insensitive" } },
              { disputeReason: { contains: query.q, mode: "insensitive" } },
              { listing: { title: { contains: query.q, mode: "insensitive" } } },
              { listing: { category: { contains: query.q, mode: "insensitive" } } },
              { buyer: { firstName: { contains: query.q, mode: "insensitive" } } },
              { buyer: { lastName: { contains: query.q, mode: "insensitive" } } },
              { seller: { firstName: { contains: query.q, mode: "insensitive" } } },
              { seller: { lastName: { contains: query.q, mode: "insensitive" } } }
            ]
          }
        : {})
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.escrowTransaction.findMany({
        where,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              category: true,
              status: true
            }
          },
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              city: true,
              province: true
            }
          },
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              city: true,
              province: true
            }
          },
          events: {
            orderBy: {
              createdAt: "asc"
            }
          }
        },
        orderBy: {
          [sortBy]: getSortOrder(query.sortOrder)
        },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.escrowTransaction.count({ where })
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

  async getEscrowById(id: string) {
    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: {
            createdAt: "asc"
          }
        },
        listing: true,
        buyer: true,
        seller: true
      }
    });

    if (!escrow) {
      throw new NotFoundException(`Escrow ${id} not found`);
    }

    return escrow;
  }

  async markShipped(id: string, dto: MarkEscrowShippedDto) {
    const escrow = await this.getEscrowById(id);

    if (escrow.status !== EscrowStatus.FUNDS_HELD) {
      throw new BadRequestException("Only funded escrows can be shipped");
    }

    return this.prisma.escrowTransaction.update({
      where: { id },
      data: {
        status: EscrowStatus.SHIPPED,
        shippingTrackingCode: dto.trackingCode,
        shippedAt: new Date(),
        events: {
          create: {
            type: EscrowEventType.SHIPPED,
            payload: {
              trackingCode: dto.trackingCode
            }
          }
        }
      },
      include: {
        events: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });
  }

  async confirmDelivery(id: string) {
    const escrow = await this.getEscrowById(id);

    if (escrow.status !== EscrowStatus.SHIPPED) {
      throw new BadRequestException("Only shipped escrows can be delivered");
    }

    const deliveredAt = new Date();
    const releaseEligibleAt = new Date(deliveredAt.getTime() + 48 * 60 * 60 * 1000);

    return this.prisma.escrowTransaction.update({
      where: { id },
      data: {
        status: EscrowStatus.DELIVERED,
        deliveredAt,
        releaseEligibleAt,
        events: {
          create: {
            type: EscrowEventType.DELIVERED,
            payload: {
              releaseEligibleAt: releaseEligibleAt.toISOString()
            }
          }
        }
      },
      include: {
        events: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });
  }

  async releaseFunds(id: string) {
    const escrow = await this.getEscrowById(id);

    if (escrow.status !== EscrowStatus.DELIVERED) {
      throw new BadRequestException("Escrow must be delivered before release");
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedEscrow = await tx.escrowTransaction.update({
        where: { id },
        data: {
          status: EscrowStatus.RELEASED,
          releasedAt: new Date(),
          events: {
            create: {
              type: EscrowEventType.RELEASED,
              payload: {
                netAmount: escrow.netAmount.toString()
              }
            }
          }
        },
        include: {
          events: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      await tx.listing.update({
        where: { id: escrow.listingId },
        data: {
          status: ListingStatus.SOLD
        }
      });

      return updatedEscrow;
    });
  }

  async openDispute(id: string, dto: OpenDisputeDto) {
    const escrow = await this.getEscrowById(id);

    if (
      escrow.status !== EscrowStatus.FUNDS_HELD &&
      escrow.status !== EscrowStatus.SHIPPED &&
      escrow.status !== EscrowStatus.DELIVERED
    ) {
      throw new BadRequestException("Escrow cannot be disputed in current status");
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedEscrow = await tx.escrowTransaction.update({
        where: { id },
        data: {
          status: EscrowStatus.DISPUTED,
          disputeReason: dto.reason,
          events: {
            create: {
              type: EscrowEventType.DISPUTED,
              payload: {
                reason: dto.reason
              }
            }
          }
        },
        include: {
          events: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      await tx.listing.update({
        where: { id: escrow.listingId },
        data: {
          status: ListingStatus.UNDER_REVIEW
        }
      });

      return updatedEscrow;
    });
  }
}
