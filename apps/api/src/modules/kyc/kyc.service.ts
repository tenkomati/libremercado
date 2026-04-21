import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { KycStatus, NotificationType, Prisma } from "@prisma/client";

import {
  getPagination,
  getSafeSortBy,
  getSortOrder,
  makePaginationMeta
} from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

import { CreateKycVerificationDto } from "./dto/create-kyc-verification.dto";
import { ListKycVerificationsQueryDto } from "./dto/list-kyc-verifications-query.dto";
import { ReviewKycVerificationDto } from "./dto/review-kyc-verification.dto";

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService
  ) {}

  async createVerification(dto: CreateKycVerificationDto) {
    const user = await this.usersService.ensureExists(dto.userId);

    if (user.status !== "ACTIVE") {
      throw new BadRequestException("Only active users can start KYC");
    }

    const verification = await this.prisma.kycVerification.create({
      data: {
        userId: dto.userId,
        provider: dto.provider,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        reviewerNotes: dto.reviewerNotes,
        documentFrontImageUrl: dto.documentFrontImageUrl,
        documentBackImageUrl: dto.documentBackImageUrl,
        selfieImageUrl: dto.selfieImageUrl,
        biometricConsentAt: dto.biometricConsentAt
          ? new Date(dto.biometricConsentAt)
          : undefined
      }
    });

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: {
        kycStatus: KycStatus.PENDING
      }
    });

    return verification;
  }

  async listVerifications(query: ListKycVerificationsQueryDto) {
    const pagination = getPagination(query);
    const sortBy = getSafeSortBy(
      query.sortBy,
      ["createdAt", "updatedAt", "reviewedAt", "status", "provider"] as const,
      "createdAt"
    );
    const where: Prisma.KycVerificationWhereInput = {
      userId: query.userId,
      status: query.status,
      ...(query.q
        ? {
            OR: [
              { provider: { contains: query.q, mode: "insensitive" } },
              { documentNumber: { contains: query.q, mode: "insensitive" } },
              { reviewerNotes: { contains: query.q, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { firstName: { contains: query.q, mode: "insensitive" } },
                    { lastName: { contains: query.q, mode: "insensitive" } },
                    { email: { contains: query.q, mode: "insensitive" } },
                    { city: { contains: query.q, mode: "insensitive" } },
                    { province: { contains: query.q, mode: "insensitive" } }
                  ]
                }
              }
            ]
          }
        : {})
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.kycVerification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              city: true,
              province: true
            }
          }
        },
        orderBy: {
          [sortBy]: getSortOrder(query.sortOrder)
        },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.kycVerification.count({ where })
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

  async getVerificationById(id: string) {
    const verification = await this.prisma.kycVerification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dni: true,
            phone: true,
            city: true,
            province: true,
            status: true,
            role: true,
            kycStatus: true,
            reputationScore: true,
            createdAt: true,
            _count: {
              select: {
                listings: true,
                buyerEscrows: true,
                sellerEscrows: true
              }
            }
          }
        }
      }
    });

    if (!verification) {
      throw new NotFoundException(`KYC verification ${id} not found`);
    }

    return verification;
  }

  async reviewVerification(id: string, dto: ReviewKycVerificationDto) {
    const verification = await this.prisma.kycVerification.findUnique({
      where: { id }
    });

    if (!verification) {
      throw new NotFoundException(`KYC verification ${id} not found`);
    }

    if (dto.status === KycStatus.PENDING) {
      throw new BadRequestException("KYC review cannot move back to pending");
    }

    const updatedVerification = await this.prisma.kycVerification.update({
      where: { id },
      data: {
        status: dto.status,
        reviewerNotes: dto.reviewerNotes,
        reviewedAt: new Date()
      }
    });

    await this.prisma.user.update({
      where: { id: verification.userId },
      data: {
        kycStatus: dto.status
      }
    });

    await this.prisma.userNotification.create({
      data: {
        userId: verification.userId,
        type: NotificationType.KYC_REVIEWED,
        title: this.getKycNotificationTitle(dto.status),
        body:
          dto.reviewerNotes ??
          "Tu verificación de identidad fue revisada por nuestro equipo.",
        resourceType: "kyc_verification",
        resourceId: id
      }
    });

    return updatedVerification;
  }

  private getKycNotificationTitle(status: KycStatus) {
    const titles: Record<KycStatus, string> = {
      [KycStatus.APPROVED]: "Identidad aprobada",
      [KycStatus.PENDING]: "Identidad pendiente",
      [KycStatus.REJECTED]: "Identidad rechazada",
      [KycStatus.REQUIRES_REVIEW]: "Necesitamos que corrijas tu identidad"
    };

    return titles[status];
  }
}
