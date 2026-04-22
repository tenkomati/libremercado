import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { compare, hash } from "bcryptjs";

import {
  getPagination,
  getSafeSortBy,
  getSortOrder,
  makePaginationMeta
} from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";

import { ChangeUserPasswordDto } from "./dto/change-user-password.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { ListUsersQueryDto } from "./dto/list-users-query.dto";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  createUser(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        ...dto
      }
    });
  }

  async listUsers(query: ListUsersQueryDto) {
    const pagination = getPagination(query);
    const sortBy = getSafeSortBy(
      query.sortBy,
      ["createdAt", "updatedAt", "firstName", "lastName", "email", "status", "role", "kycStatus"] as const,
      "createdAt"
    );
    const where: Prisma.UserWhereInput = {
      status: query.status,
      role: query.role,
      kycStatus: query.kycStatus,
      ...(query.q
        ? {
            OR: [
              { firstName: { contains: query.q, mode: "insensitive" } },
              { lastName: { contains: query.q, mode: "insensitive" } },
              { email: { contains: query.q, mode: "insensitive" } },
              { dni: { contains: query.q, mode: "insensitive" } },
              { city: { contains: query.q, mode: "insensitive" } },
              { province: { contains: query.q, mode: "insensitive" } }
            ]
          }
        : {})
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: {
          _count: {
            select: {
              listings: true,
              buyerEscrows: true,
              sellerEscrows: true
            }
          }
        },
        orderBy: {
          [sortBy]: getSortOrder(query.sortOrder)
        },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      items: items.map((user) => this.toSafeUser(user)),
      meta: makePaginationMeta({
        page: pagination.page,
        pageSize: pagination.pageSize,
        total
      })
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        kycVerifications: {
          orderBy: {
            createdAt: "desc"
          }
        },
        listings: {
          select: {
            id: true,
            title: true,
            category: true,
            condition: true,
            status: true,
            price: true,
            currency: true,
            locationCity: true,
            locationProvince: true,
            publishedAt: true,
            createdAt: true
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        buyerEscrows: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
            listing: {
              select: {
                id: true,
                title: true
              }
            },
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            meetingProposals: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: {
                proposedAt: "asc"
              }
            },
            deliveryProposals: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: {
                createdAt: "desc"
              }
            },
            availabilitySlots: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                },
                selectedBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: {
                startsAt: "asc"
              }
            },
            messages: {
              include: {
                sender: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: {
                createdAt: "asc"
              },
              take: 20
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        sellerEscrows: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
            listing: {
              select: {
                id: true,
                title: true
              }
            },
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            meetingProposals: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: {
                proposedAt: "asc"
              }
            },
            deliveryProposals: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: {
                createdAt: "desc"
              }
            },
            availabilitySlots: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                },
                selectedBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: {
                startsAt: "asc"
              }
            },
            messages: {
              include: {
                sender: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: {
                createdAt: "asc"
              },
              take: 20
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        notifications: {
          orderBy: {
            createdAt: "desc"
          },
          take: 10
        }
      }
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.toSafeUser(user);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    await this.ensureExists(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        status: dto.status
      }
    });
  }

  async updateRole(id: string, dto: UpdateUserRoleDto) {
    await this.ensureExists(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        role: dto.role
      }
    });
  }

  async updateProfile(id: string, dto: UpdateUserProfileDto) {
    await this.ensureExists(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.province ? { province: dto.province.trim() } : {}),
        ...(dto.city ? { city: dto.city.trim() } : {})
      }
    });

    return this.toSafeUser(updated);
  }

  async changePassword(id: string, dto: ChangeUserPasswordDto) {
    const user = await this.ensureExists(id);
    const isPasswordValid = await compare(dto.currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException("New password must be different");
    }

    const passwordHash = await hash(dto.newPassword, 12);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash
      }
    });

    return this.toSafeUser(updated);
  }

  async ensureExists(id: string) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  findByDni(dni: string) {
    return this.prisma.user.findUnique({
      where: { dni }
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  toSafeUser<T extends { passwordHash?: string }>(user: T) {
    return Object.fromEntries(
      Object.entries(user).filter(([key]) => key !== "passwordHash")
    ) as Omit<T, "passwordHash">;
  }
}
