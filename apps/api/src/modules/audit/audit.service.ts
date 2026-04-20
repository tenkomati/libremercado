import { Injectable } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";

import {
  getPagination,
  getSafeSortBy,
  getSortOrder,
  makePaginationMeta
} from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";

import { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  logAction(params: {
    actorUserId: string;
    actorRole: UserRole;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.adminAuditLog.create({
      data: {
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: params.metadata
      }
    });
  }

  async listRecent(query: ListAuditLogsQueryDto) {
    const pagination = getPagination({
      ...query,
      pageSize: query.pageSize ?? query.limit ?? 20
    });
    const sortBy = getSafeSortBy(
      query.sortBy,
      ["createdAt", "action", "resourceType", "actorRole"] as const,
      "createdAt"
    );
    const where: Prisma.AdminAuditLogWhereInput = {
      action: query.action,
      resourceType: query.resourceType,
      ...(query.q
        ? {
            OR: [
              { action: { contains: query.q, mode: "insensitive" } },
              { resourceType: { contains: query.q, mode: "insensitive" } },
              { resourceId: { contains: query.q, mode: "insensitive" } },
              {
                actor: {
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
      this.prisma.adminAuditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          [sortBy]: getSortOrder(query.sortOrder)
        },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.adminAuditLog.count({ where })
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

  async getOverview() {
    const [
      totalUsers,
      usersByStatus,
      usersByRole,
      kycByStatus,
      listingsByStatus,
      escrowsByStatus,
      escrowFinancials
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ["status"],
        _count: {
          _all: true
        }
      }),
      this.prisma.user.groupBy({
        by: ["role"],
        _count: {
          _all: true
        }
      }),
      this.prisma.kycVerification.groupBy({
        by: ["status"],
        _count: {
          _all: true
        }
      }),
      this.prisma.listing.groupBy({
        by: ["status"],
        _count: {
          _all: true
        }
      }),
      this.prisma.escrowTransaction.groupBy({
        by: ["status"],
        _count: {
          _all: true
        }
      }),
      this.prisma.escrowTransaction.aggregate({
        _sum: {
          amount: true,
          feeAmount: true,
          netAmount: true
        },
        _avg: {
          amount: true
        },
        _count: {
          _all: true
        }
      })
    ]);

    const kycStatusCounts = this.toCountMap(kycByStatus, "status");
    const listingStatusCounts = this.toCountMap(listingsByStatus, "status");
    const escrowStatusCounts = this.toCountMap(escrowsByStatus, "status");
    const riskQueue =
      (kycStatusCounts.REQUIRES_REVIEW ?? 0) +
      (listingStatusCounts.UNDER_REVIEW ?? 0) +
      (escrowStatusCounts.DISPUTED ?? 0);

    return {
      users: {
        total: totalUsers,
        byStatus: this.toCountMap(usersByStatus, "status"),
        byRole: this.toCountMap(usersByRole, "role")
      },
      kyc: {
        byStatus: kycStatusCounts
      },
      listings: {
        byStatus: listingStatusCounts
      },
      escrows: {
        total: escrowFinancials._count._all,
        byStatus: escrowStatusCounts,
        riskQueue,
        financials: {
          totalGmv: escrowFinancials._sum.amount?.toString() ?? "0",
          estimatedRevenue: escrowFinancials._sum.feeAmount?.toString() ?? "0",
          netSellerAmount: escrowFinancials._sum.netAmount?.toString() ?? "0",
          averageTicket: escrowFinancials._avg.amount?.toString() ?? "0"
        }
      }
    };
  }

  private toCountMap<Key extends string>(
    rows: Array<Record<Key, string> & { _count: { _all: number } }>,
    key: Key
  ) {
    return rows.reduce<Record<string, number>>((counts, row) => {
      counts[row[key]] = row._count._all;
      return counts;
    }, {});
  }
}
