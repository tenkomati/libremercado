import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AvailabilitySlotStatus,
  DeliveryMethod,
  DeliveryProposalStatus,
  EscrowEventType,
  EscrowStatus,
  KycStatus,
  ListingStatus,
  MeetingProposalStatus,
  NotificationType,
  PaymentStatus,
  Prisma
} from "@prisma/client";

import {
  getPagination,
  getSafeSortBy,
  getSortOrder,
  makePaginationMeta
} from "../common/pagination";
import { EmailService } from "../email/email.service";
import { ListingsService } from "../listings/listings.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

import { CancelEscrowDto } from "./dto/cancel-escrow.dto";
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
import { GoogleMapsService } from "./google-maps.service";

@Injectable()
export class EscrowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly listingsService: ListingsService,
    private readonly googleMapsService: GoogleMapsService,
    private readonly emailService: EmailService
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
          status: EscrowStatus.FUNDS_PENDING,
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

  async markFundsHeld(id: string, payload?: Prisma.InputJsonValue) {
    const escrow = await this.getEscrowById(id);

    if (escrow.status !== EscrowStatus.FUNDS_PENDING) {
      throw new BadRequestException("Only pending escrows can move to funds held");
    }

    return this.prisma.escrowTransaction.update({
      where: { id },
      data: {
        status: EscrowStatus.FUNDS_HELD,
        events: {
          create: {
            type: EscrowEventType.FUNDS_HELD,
            payload: payload ?? {
              source: "payment"
            }
          }
        }
      }
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
            take: 30
          },
          paymentIntents: {
            orderBy: {
              createdAt: "desc"
            },
            include: {
              events: {
                orderBy: {
                  createdAt: "asc"
                }
              }
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
        seller: true,
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
          }
        },
        paymentIntents: {
          orderBy: {
            createdAt: "desc"
          },
          include: {
            events: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        }
      }
    });

    if (!escrow) {
      throw new NotFoundException(`Escrow ${id} not found`);
    }

    return escrow;
  }

  async createMeetingProposal(
    escrowId: string,
    dto: CreateMeetingProposalDto,
    user: { sub: string; role: string }
  ) {
    const escrow = await this.getEscrowById(escrowId);
    this.ensureCanOperateEscrow(escrow, user);

    if (
      escrow.status !== EscrowStatus.FUNDS_HELD &&
      escrow.status !== EscrowStatus.SHIPPED &&
      escrow.status !== EscrowStatus.DELIVERED
    ) {
      throw new BadRequestException("Meeting can only be proposed for active escrows");
    }

    const proposedAt = new Date(dto.proposedAt);

    if (Number.isNaN(proposedAt.getTime()) || proposedAt <= new Date()) {
      throw new BadRequestException("Meeting date must be in the future");
    }

    const proposal = await this.prisma.escrowMeetingProposal.create({
      data: {
        escrowId,
        createdByUserId: user.sub,
        brand: dto.brand,
        stationName: dto.stationName,
        address: dto.address,
        city: dto.city,
        province: dto.province,
        proposedAt
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    await this.notifyCounterparty(escrow, user.sub, {
      type: NotificationType.MEETING_PROPOSED,
      title: "Nueva propuesta de encuentro",
      body: `${dto.brand} · ${dto.stationName} para coordinar la entrega segura.`,
      resourceType: "escrow",
      resourceId: escrowId
    });

    return proposal;
  }

  async respondMeetingProposal(
    escrowId: string,
    proposalId: string,
    dto: RespondMeetingProposalDto,
    user: { sub: string; role: string }
  ) {
    const escrow = await this.getEscrowById(escrowId);
    this.ensureCanOperateEscrow(escrow, user);

    if (
      dto.status !== MeetingProposalStatus.ACCEPTED &&
      dto.status !== MeetingProposalStatus.DECLINED
    ) {
      throw new BadRequestException("Meeting proposal can only be accepted or declined");
    }

    const proposal = await this.prisma.escrowMeetingProposal.findUnique({
      where: { id: proposalId }
    });

    if (!proposal || proposal.escrowId !== escrowId) {
      throw new NotFoundException(`Meeting proposal ${proposalId} not found`);
    }

    if (proposal.createdByUserId === user.sub && user.role === "USER") {
      throw new BadRequestException("Users cannot respond to their own meeting proposal");
    }

    if (proposal.status !== MeetingProposalStatus.PENDING) {
      throw new BadRequestException("Meeting proposal is not pending");
    }

    const updatedProposal = await this.prisma.escrowMeetingProposal.update({
      where: { id: proposalId },
      data: {
        status: dto.status,
        responseNote: dto.responseNote,
        respondedAt: new Date()
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    await this.createNotification({
      userId: proposal.createdByUserId,
      type: NotificationType.MEETING_RESPONDED,
      title:
        dto.status === MeetingProposalStatus.ACCEPTED
          ? "Encuentro aceptado"
          : "Encuentro rechazado",
      body: dto.responseNote ?? "La otra parte respondió tu propuesta de encuentro.",
      resourceType: "escrow",
      resourceId: escrowId
    });

    return updatedProposal;
  }

  async getMeetingSuggestions(
    escrowId: string,
    user: { sub: string; role: string }
  ) {
    const escrow = await this.getEscrowById(escrowId);
    this.ensureCanOperateEscrow(escrow, user);

    return {
      items: await this.googleMapsService.getFuelStationSuggestions({
        buyer: {
          city: escrow.buyer.city,
          province: escrow.buyer.province
        },
        seller: {
          city: escrow.seller.city,
          province: escrow.seller.province
        }
      })
    };
  }

  async createDeliveryProposal(
    escrowId: string,
    dto: CreateDeliveryProposalDto,
    user: { sub: string; role: string }
  ) {
    const escrow = await this.getEscrowById(escrowId);
    this.ensureCanOperateEscrow(escrow, user);
    this.ensureActiveMeetingEscrow(escrow);

    if (user.role === "USER" && escrow.sellerId !== user.sub) {
      throw new BadRequestException("Only the seller can propose delivery method");
    }

    const proposal = await this.prisma.escrowDeliveryProposal.create({
      data: {
        escrowId,
        createdByUserId: user.sub,
        method: dto.method,
        details: dto.details
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    await this.notifyCounterparty(escrow, user.sub, {
      type: NotificationType.DELIVERY_PROPOSED,
      title: "Nuevo método de entrega propuesto",
      body: `${this.getDeliveryMethodLabel(dto.method)}${
        dto.details ? `: ${dto.details}` : ""
      }`,
      resourceType: "escrow",
      resourceId: escrowId
    });

    return proposal;
  }

  async respondDeliveryProposal(
    escrowId: string,
    proposalId: string,
    dto: RespondDeliveryProposalDto,
    user: { sub: string; role: string }
  ) {
    const escrow = await this.getEscrowById(escrowId);
    this.ensureCanOperateEscrow(escrow, user);

    if (
      dto.status !== DeliveryProposalStatus.ACCEPTED &&
      dto.status !== DeliveryProposalStatus.DECLINED
    ) {
      throw new BadRequestException("Delivery proposal can only be accepted or declined");
    }

    const proposal = await this.prisma.escrowDeliveryProposal.findUnique({
      where: { id: proposalId }
    });

    if (!proposal || proposal.escrowId !== escrowId) {
      throw new NotFoundException(`Delivery proposal ${proposalId} not found`);
    }

    if (proposal.createdByUserId === user.sub && user.role === "USER") {
      throw new BadRequestException("Users cannot respond to their own delivery proposal");
    }

    if (proposal.status !== DeliveryProposalStatus.PENDING) {
      throw new BadRequestException("Delivery proposal is not pending");
    }

    const updatedProposal = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.escrowDeliveryProposal.update({
        where: { id: proposalId },
        data: {
          status: dto.status,
          responseNote: dto.responseNote,
          respondedAt: new Date()
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (dto.status === DeliveryProposalStatus.ACCEPTED) {
        await tx.escrowTransaction.update({
          where: { id: escrowId },
          data: {
            shippingProvider: this.getDeliveryMethodLabel(proposal.method)
          }
        });
      }

      return updated;
    });

    await this.createNotification({
      userId: proposal.createdByUserId,
      type: NotificationType.DELIVERY_RESPONDED,
      title:
        dto.status === DeliveryProposalStatus.ACCEPTED
          ? "Método de entrega aceptado"
          : "Método de entrega rechazado",
      body: dto.responseNote ?? "La otra parte respondió tu propuesta de entrega.",
      resourceType: "escrow",
      resourceId: escrowId
    });

    return updatedProposal;
  }

  async createAvailabilitySlot(
    escrowId: string,
    dto: CreateAvailabilitySlotDto,
    user: { sub: string; role: string }
  ) {
    const escrow = await this.getEscrowById(escrowId);
    this.ensureCanOperateEscrow(escrow, user);

    if (user.role === "USER" && escrow.sellerId !== user.sub) {
      throw new BadRequestException("Only the seller can publish availability");
    }

    this.ensureActiveMeetingEscrow(escrow);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      throw new BadRequestException("Availability must start in the future");
    }

    if (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException("Availability end must be after start");
    }

    if (
      startsAt.getFullYear() !== endsAt.getFullYear() ||
      startsAt.getMonth() !== endsAt.getMonth() ||
      startsAt.getDate() !== endsAt.getDate()
    ) {
      throw new BadRequestException("Availability must start and end on the same day");
    }

    const slot = await this.prisma.escrowAvailabilitySlot.create({
      data: {
        escrowId,
        createdByUserId: user.sub,
        startsAt,
        endsAt
      },
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
      }
    });

    await this.createNotification({
      userId: escrow.buyerId,
      type: NotificationType.AVAILABILITY_ADDED,
      title: "El vendedor propuso horarios",
      body: "Ya podés elegir una franja para coordinar el encuentro seguro.",
      resourceType: "escrow",
      resourceId: escrowId
    });

    return slot;
  }

  async selectAvailabilitySlot(
    escrowId: string,
    slotId: string,
    dto: SelectAvailabilitySlotDto,
    user: { sub: string; role: string }
  ) {
    const escrow = await this.getEscrowById(escrowId);
    this.ensureCanOperateEscrow(escrow, user);

    if (user.role === "USER" && escrow.buyerId !== user.sub) {
      throw new BadRequestException("Only the buyer can select seller availability");
    }

    const slot = await this.prisma.escrowAvailabilitySlot.findUnique({
      where: { id: slotId }
    });

    if (!slot || slot.escrowId !== escrowId) {
      throw new NotFoundException(`Availability slot ${slotId} not found`);
    }

    if (slot.status !== AvailabilitySlotStatus.OPEN) {
      throw new BadRequestException("Availability slot is not open");
    }

    const updatedSlot = await this.prisma.escrowAvailabilitySlot.update({
      where: { id: slotId },
      data: {
        status: AvailabilitySlotStatus.SELECTED,
        selectedByUserId: user.sub
      },
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
      }
    });

    if (dto.note) {
      await this.prisma.escrowMessage.create({
        data: {
          escrowId,
          senderUserId: user.sub,
          body: dto.note
        }
      });
    }

    await this.createNotification({
      userId: escrow.sellerId,
      type: NotificationType.AVAILABILITY_SELECTED,
      title: "El comprador eligió un horario",
      body: dto.note ?? "Revisá la coordinación del encuentro seguro.",
      resourceType: "escrow",
      resourceId: escrowId
    });

    return updatedSlot;
  }

  async sendMessage(
    escrowId: string,
    dto: CreateEscrowMessageDto,
    user: { sub: string; role: string }
  ) {
    const escrow = await this.getEscrowById(escrowId);
    this.ensureCanOperateEscrow(escrow, user);

    const message = await this.prisma.escrowMessage.create({
      data: {
        escrowId,
        senderUserId: user.sub,
        body: dto.body
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    await this.notifyCounterparty(escrow, user.sub, {
      type: NotificationType.ESCROW_MESSAGE,
      title: "Nuevo mensaje en la operación",
      body: dto.body,
      resourceType: "escrow",
      resourceId: escrowId
    });

    return message;
  }

  private ensureCanOperateEscrow(
    escrow: { buyerId: string; sellerId: string },
    user: { sub: string; role: string }
  ) {
    if (user.role === "ADMIN" || user.role === "OPS") {
      return;
    }

    if (escrow.buyerId !== user.sub && escrow.sellerId !== user.sub) {
      throw new BadRequestException("Users can only operate their own escrow");
    }
  }

  private ensureActiveMeetingEscrow(escrow: { status: EscrowStatus }) {
    if (
      escrow.status !== EscrowStatus.FUNDS_HELD &&
      escrow.status !== EscrowStatus.SHIPPED &&
      escrow.status !== EscrowStatus.DELIVERED
    ) {
      throw new BadRequestException("Meeting can only be coordinated for active escrows");
    }
  }

  private async notifyCounterparty(
    escrow: { buyerId: string; sellerId: string },
    actorUserId: string,
    data: Omit<Prisma.UserNotificationUncheckedCreateInput, "id" | "userId" | "createdAt">
  ) {
    const userId =
      actorUserId === escrow.buyerId
        ? escrow.sellerId
        : actorUserId === escrow.sellerId
          ? escrow.buyerId
          : null;

    if (!userId) {
      return;
    }

    await this.createNotification({
      ...data,
      userId
    });
  }

  private getDeliveryMethodLabel(method: DeliveryMethod) {
    const labels: Record<DeliveryMethod, string> = {
      [DeliveryMethod.COURIER]: "Correo / operador logístico",
      [DeliveryMethod.MESSAGING]: "Mensajería privada",
      [DeliveryMethod.PICKUP]: "Retiro acordado",
      [DeliveryMethod.SAFE_MEETING]: "Encuentro seguro"
    };

    return labels[method];
  }

  private async createNotification(data: Prisma.UserNotificationUncheckedCreateInput) {
    const notification = await this.prisma.userNotification.create({
      data: {
        ...data,
        body: data.body.length > 220 ? `${data.body.slice(0, 217)}...` : data.body
      }
    });

    await this.emailService.sendNotificationEmail({
      userId: notification.userId,
      title: notification.title,
      body: notification.body,
      resourceType: notification.resourceType,
      resourceId: notification.resourceId
    });

    return notification;
  }

  async markShipped(id: string, dto: MarkEscrowShippedDto) {
    const escrow = await this.getEscrowById(id);

    if (escrow.status !== EscrowStatus.FUNDS_HELD) {
      throw new BadRequestException("Only funded escrows can be shipped");
    }

    const updatedEscrow = await this.prisma.escrowTransaction.update({
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

    await this.notifyPaymentParties(escrow, id, {
      title: "Entrega en camino",
      body: dto.trackingCode
        ? `El vendedor informó el código de seguimiento: ${dto.trackingCode}.`
        : "El vendedor marcó la operación como enviada."
    });

    return updatedEscrow;
  }

  async confirmDelivery(id: string) {
    const escrow = await this.getEscrowById(id);

    if (escrow.status !== EscrowStatus.SHIPPED) {
      throw new BadRequestException("Only shipped escrows can be delivered");
    }

    const deliveredAt = new Date();
    const releaseEligibleAt = new Date(deliveredAt.getTime() + 48 * 60 * 60 * 1000);

    const updatedEscrow = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.escrowTransaction.update({
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

      await this.markPaymentsReadyToRelease(tx, id, releaseEligibleAt);

      return updated;
    });

    await this.notifyPaymentParties(escrow, id, {
      title: "Entrega confirmada",
      body: "La entrega fue confirmada. Los fondos quedan listos para liberarse según las reglas de la operación."
    });

    return updatedEscrow;
  }

  async releaseFunds(id: string) {
    const escrow = await this.getEscrowById(id);

    if (escrow.status !== EscrowStatus.DELIVERED) {
      throw new BadRequestException("Escrow must be delivered before release");
    }

    const updatedEscrow = await this.prisma.$transaction(async (tx) => {
      const releasedAt = new Date();
      const updatedEscrow = await tx.escrowTransaction.update({
        where: { id },
        data: {
          status: EscrowStatus.RELEASED,
          releasedAt,
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

      await this.markPaymentsReleased(tx, id, releasedAt);

      return updatedEscrow;
    });

    await this.notifyPaymentParties(escrow, id, {
      title: "Fondos liberados",
      body: "Los fondos de la operación fueron liberados y el pago quedó registrado como finalizado."
    });

    return updatedEscrow;
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

    const updatedEscrow = await this.prisma.$transaction(async (tx) => {
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

      await this.markPaymentsDisputed(tx, id, dto.reason);

      return updatedEscrow;
    });

    await this.notifyPaymentParties(escrow, id, {
      title: "Pago en disputa",
      body: "La operación entró en disputa. Los fondos quedan retenidos hasta resolución operativa."
    });

    return updatedEscrow;
  }

  async cancelEscrow(id: string, dto: CancelEscrowDto) {
    const escrow = await this.getEscrowById(id);

    if (
      escrow.status !== EscrowStatus.FUNDS_PENDING &&
      escrow.status !== EscrowStatus.FUNDS_HELD &&
      escrow.status !== EscrowStatus.DISPUTED
    ) {
      throw new BadRequestException("Escrow cannot be cancelled in current status");
    }

    const reason =
      dto.reason ?? "Operación cancelada desde consola admin con reembolso controlado.";
    const updatedEscrow = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.escrowTransaction.update({
        where: { id },
        data: {
          status: EscrowStatus.REFUNDED,
          disputeReason: reason,
          events: {
            create: [
              {
                type: EscrowEventType.CANCELLED,
                payload: {
                  reason
                }
              },
              {
                type: EscrowEventType.REFUNDED,
                payload: {
                  reason,
                  amount: escrow.amount.toString()
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
        where: { id: escrow.listingId },
        data: {
          status: ListingStatus.PUBLISHED
        }
      });

      await this.markPaymentsRefunded(tx, id, reason);

      return updated;
    });

    await this.notifyPaymentParties(escrow, id, {
      title: "Operación cancelada y reembolsada",
      body: "La operación fue cancelada. Si había un pago aprobado, queda registrado como reembolsado."
    });

    return updatedEscrow;
  }

  private async markPaymentsReadyToRelease(
    tx: Prisma.TransactionClient,
    escrowId: string,
    readyToReleaseAt: Date
  ) {
    const paymentIntents = await tx.paymentIntent.findMany({
      where: {
        escrowId,
        status: PaymentStatus.FUNDS_HELD
      }
    });

    for (const paymentIntent of paymentIntents) {
      await tx.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: PaymentStatus.READY_TO_RELEASE,
          readyToReleaseAt,
          providerStatus: "ready_to_release",
          events: {
            create: {
              provider: paymentIntent.provider,
              status: PaymentStatus.READY_TO_RELEASE,
              providerEventId: `${paymentIntent.provider.toLowerCase()}_${paymentIntent.id}_ready_to_release`,
              rawPayload: {
                action: "ready_to_release",
                escrowId,
                readyToReleaseAt: readyToReleaseAt.toISOString()
              }
            }
          }
        }
      });
    }
  }

  private async markPaymentsReleased(
    tx: Prisma.TransactionClient,
    escrowId: string,
    releasedAt: Date
  ) {
    const paymentIntents = await tx.paymentIntent.findMany({
      where: {
        escrowId,
        status: {
          in: [PaymentStatus.FUNDS_HELD, PaymentStatus.READY_TO_RELEASE]
        }
      }
    });

    for (const paymentIntent of paymentIntents) {
      await tx.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: PaymentStatus.RELEASED,
          releasedAt,
          providerStatus: "released",
          events: {
            create: {
              provider: paymentIntent.provider,
              status: PaymentStatus.RELEASED,
              providerEventId: `${paymentIntent.provider.toLowerCase()}_${paymentIntent.id}_released`,
              rawPayload: {
                action: "released",
                escrowId,
                releasedAt: releasedAt.toISOString(),
                netAmount: paymentIntent.netAmount.toString()
              }
            }
          }
        }
      });
    }
  }

  private async markPaymentsDisputed(
    tx: Prisma.TransactionClient,
    escrowId: string,
    reason: string
  ) {
    const paymentIntents = await tx.paymentIntent.findMany({
      where: {
        escrowId,
        status: {
          in: [
            PaymentStatus.FUNDS_HELD,
            PaymentStatus.READY_TO_RELEASE,
            PaymentStatus.PAYMENT_APPROVED
          ]
        }
      }
    });

    for (const paymentIntent of paymentIntents) {
      await tx.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: PaymentStatus.DISPUTED,
          providerStatus: "disputed",
          events: {
            create: {
              provider: paymentIntent.provider,
              status: PaymentStatus.DISPUTED,
              providerEventId: `${paymentIntent.provider.toLowerCase()}_${paymentIntent.id}_disputed`,
              rawPayload: {
                action: "disputed",
                escrowId,
                reason
              }
            }
          }
        }
      });
    }
  }

  private async markPaymentsRefunded(
    tx: Prisma.TransactionClient,
    escrowId: string,
    reason: string
  ) {
    const paymentIntents = await tx.paymentIntent.findMany({
      where: {
        escrowId,
        status: {
          in: [
            PaymentStatus.PAYMENT_PENDING,
            PaymentStatus.PAYMENT_APPROVED,
            PaymentStatus.FUNDS_HELD,
            PaymentStatus.READY_TO_RELEASE,
            PaymentStatus.DISPUTED
          ]
        }
      }
    });

    const refundedAt = new Date();

    for (const paymentIntent of paymentIntents) {
      await tx.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: PaymentStatus.REFUNDED,
          refundedAt,
          providerStatus: "refunded",
          events: {
            create: {
              provider: paymentIntent.provider,
              status: PaymentStatus.REFUNDED,
              providerEventId: `${paymentIntent.provider.toLowerCase()}_${paymentIntent.id}_refunded`,
              rawPayload: {
                action: "refunded",
                escrowId,
                reason,
                refundedAt: refundedAt.toISOString(),
                amount: paymentIntent.amount.toString()
              }
            }
          }
        }
      });
    }
  }

  private async notifyPaymentParties(
    escrow: { buyerId: string; sellerId: string },
    escrowId: string,
    data: { title: string; body: string }
  ) {
    await this.prisma.userNotification.createMany({
      data: [
        {
          userId: escrow.buyerId,
          type: NotificationType.PAYMENT_UPDATED,
          title: data.title,
          body: data.body,
          resourceType: "escrow",
          resourceId: escrowId
        },
        {
          userId: escrow.sellerId,
          type: NotificationType.PAYMENT_UPDATED,
          title: data.title,
          body: data.body,
          resourceType: "escrow",
          resourceId: escrowId
        }
      ]
    });

    await this.emailService.sendBulkNotificationEmails([
      {
        userId: escrow.buyerId,
        title: data.title,
        body: data.body,
        resourceType: "escrow",
        resourceId: escrowId
      },
      {
        userId: escrow.sellerId,
        title: data.title,
        body: data.body,
        resourceType: "escrow",
        resourceId: escrowId
      }
    ]);
  }
}
