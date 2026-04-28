import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  CurrencyCode,
  KycStatus,
  ListingCondition,
  ListingDraftStep,
  ListingDraftStatus,
  ListingStatus,
  Prisma,
  ProductMediaType
} from "@prisma/client";

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
import { PublishListingDraftDto } from "./dto/publish-listing-draft.dto";
import { SearchCatalogDto } from "./dto/search-catalog.dto";
import { UpdateListingDraftDto } from "./dto/update-listing-draft.dto";
import { UpdateListingStatusDto } from "./dto/update-listing-status.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";

const PRODUCT_DRAFT_INCLUDE = {
  product: {
    include: {
      catalogProduct: true,
      media: {
        orderBy: {
          sortOrder: "asc"
        }
      }
    }
  },
  matchedCatalogProduct: true
} satisfies Prisma.ListingDraftInclude;

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

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sellerId: dto.sellerId,
          title: dto.title,
          slugBase: slugify(dto.title),
          brand: inferBrandFromTitle(dto.title),
          category: dto.category,
          description: dto.description,
          condition: dto.condition,
          searchTags: buildAutoTags({
            title: dto.title,
            category: dto.category,
            brand: inferBrandFromTitle(dto.title),
            locationCity: dto.locationCity,
            condition: dto.condition
          }),
          marketTags: buildMarketTags({
            condition: dto.condition
          }),
          media: dto.images?.length
            ? {
                create: dto.images.map((image, index) => ({
                  url: image.url,
                  type: ProductMediaType.IMAGE,
                  sortOrder: index,
                  ...analyzeMediaUrl(image.url, ProductMediaType.IMAGE)
                }))
              }
            : undefined
        }
      });

      return tx.listing.create({
        data: {
          sellerId: dto.sellerId,
          productId: product.id,
          title: dto.title,
          slug: buildListingSlug(dto.title, dto.condition, dto.locationCity),
          description: dto.description,
          category: dto.category,
          condition: dto.condition,
          price: new Prisma.Decimal(dto.price),
          currency,
          locationProvince: dto.locationProvince,
          locationCity: dto.locationCity,
          status: initialStatus,
          autoTags: buildAutoTags({
            title: dto.title,
            category: dto.category,
            brand: inferBrandFromTitle(dto.title),
            locationCity: dto.locationCity,
            condition: dto.condition
          }),
          marketTags: buildMarketTags({
            condition: dto.condition
          }),
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
    });
  }

  async searchCatalog(dto: SearchCatalogDto) {
    const normalizedQuery = normalizeCatalogSearchInput(dto.query, dto.referenceImageUrl);

    if (!normalizedQuery) {
      return {
        query: "",
        items: [],
        requiresManualInput: true
      };
    }

    const items = await this.prisma.catalogProduct.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: normalizedQuery, mode: "insensitive" } },
          { brand: { contains: normalizedQuery, mode: "insensitive" } },
          { model: { contains: normalizedQuery, mode: "insensitive" } },
          { category: { contains: normalizedQuery, mode: "insensitive" } },
          { searchAliases: { has: normalizedQuery.toLowerCase() } }
        ]
      },
      orderBy: [{ title: "asc" }],
      take: 6
    });

    return {
      query: normalizedQuery,
      items,
      requiresManualInput: items.length === 0
    };
  }

  async getOrCreateActiveDraft(userId: string) {
    const user = await this.usersService.ensureExists(userId);
    const existing = await this.prisma.listingDraft.findFirst({
      where: {
        sellerId: userId,
        status: ListingDraftStatus.OPEN
      },
      include: PRODUCT_DRAFT_INCLUDE,
      orderBy: {
        updatedAt: "desc"
      }
    });

    if (existing) {
      return existing;
    }

    const product = await this.prisma.product.create({
      data: {
        sellerId: userId,
        category: null
      }
    });

    return this.prisma.listingDraft.create({
      data: {
        sellerId: userId,
        productId: product.id,
        currency: CurrencyCode.ARS,
        locationProvince: user.province,
        locationCity: user.city
      },
      include: PRODUCT_DRAFT_INCLUDE
    });
  }

  async getDraftById(id: string, userId: string) {
    const draft = await this.prisma.listingDraft.findUnique({
      where: { id },
      include: PRODUCT_DRAFT_INCLUDE
    });

    if (!draft || draft.sellerId !== userId) {
      throw new NotFoundException(`Listing draft ${id} not found`);
    }

    return draft;
  }

  async updateDraft(id: string, userId: string, dto: UpdateListingDraftDto) {
    const draft = await this.getDraftById(id, userId);
    const settings = await this.platformSettingsService.getSettings();
    const matchedCatalogProduct = dto.matchedCatalogProductId
      ? await this.prisma.catalogProduct.findUnique({
          where: { id: dto.matchedCatalogProductId }
        })
      : dto.matchedCatalogProductId === null
        ? null
        : undefined;

    if (dto.currency) {
      await this.getAllowedCurrency(dto.currency);
    }

    const nextCurrency = dto.currency ?? draft.currency;
    const nextCondition = dto.condition ?? draft.product.condition ?? ListingCondition.GOOD;
    const nextCategory =
      dto.category ??
      matchedCatalogProduct?.category ??
      draft.product.category ??
      null;
    const nextTitle =
      dto.title ??
      matchedCatalogProduct?.title ??
      draft.product.title ??
      null;
    const nextBrand =
      dto.brand ??
      matchedCatalogProduct?.brand ??
      draft.product.brand ??
      inferBrandFromTitle(nextTitle ?? "");
    const nextModel =
      dto.model ??
      matchedCatalogProduct?.model ??
      draft.product.model ??
      null;
    const nextMedia = dto.media ?? draft.product.media.map((media) => ({
      url: media.url,
      type: media.type
    }));
    const hasVideo = nextMedia.some((media) => media.type === "VIDEO");
    const askingPrice =
      dto.askingPrice ??
      (dto.targetNetAmount !== undefined
        ? calculateAskingPriceFromNet(dto.targetNetAmount, Number(settings.sellerCommissionPercentage))
        : draft.askingPrice
          ? Number(draft.askingPrice)
          : undefined);

    const insuranceFeeEstimate = shouldOfferInsurance(nextCategory, askingPrice, nextCurrency)
      ? calculateInsuranceEstimate(askingPrice ?? 0)
      : 0;

    return this.prisma.$transaction(async (tx) => {
      if (dto.media) {
        await tx.productMedia.deleteMany({
          where: {
            productId: draft.productId
          }
        });
      }

      await tx.product.update({
        where: { id: draft.productId },
        data: {
          catalogProductId:
            matchedCatalogProduct === undefined
              ? undefined
              : matchedCatalogProduct?.id ?? null,
          title: nextTitle,
          slugBase: nextTitle ? slugify(nextTitle) : draft.product.slugBase,
          brand: nextBrand,
          model: nextModel,
          category: nextCategory,
          manufactureYear: dto.manufactureYear ?? draft.product.manufactureYear,
          description: dto.description ?? draft.product.description,
          condition: nextCondition,
          serialNumber: dto.serialNumber ?? draft.product.serialNumber,
          imei: dto.imei ?? draft.product.imei,
          invoiceVerified: dto.invoiceVerified ?? draft.product.invoiceVerified,
          transparencyBadge:
            (dto.invoiceVerified ?? draft.product.invoiceVerified) ||
            Boolean(dto.serialNumber ?? draft.product.serialNumber) ||
            Boolean(dto.imei ?? draft.product.imei),
          technicalSpecs:
            toPrismaJson(
              dto.technicalSpecs ??
                matchedCatalogProduct?.technicalSpecs ??
                draft.product.technicalSpecs ??
                undefined
            ),
          searchTags: buildAutoTags({
            title: nextTitle ?? "",
            category: nextCategory,
            brand: nextBrand,
            locationCity: dto.locationCity ?? draft.locationCity ?? undefined,
            condition: nextCondition,
            year: dto.manufactureYear ?? draft.product.manufactureYear ?? undefined,
            technicalSpecs:
              dto.technicalSpecs ??
              matchedCatalogProduct?.technicalSpecs ??
              draft.product.technicalSpecs
          }),
          marketTags: buildMarketTags({
            condition: nextCondition,
            invoiceVerified: dto.invoiceVerified ?? draft.product.invoiceVerified,
            price: askingPrice,
            aiSuggestedPrice: matchedCatalogProduct
              ? extractSuggestedPrice(matchedCatalogProduct.technicalSpecs)
              : undefined
          }),
          visionSummary: buildVisionSummary(nextMedia),
          media: dto.media
            ? {
                create: dto.media.map((media, index) => ({
                  url: media.url,
                  type: media.type as ProductMediaType,
                  sortOrder: index,
                  ...analyzeMediaUrl(media.url, media.type as ProductMediaType)
                }))
              }
            : undefined
        }
      });

      return tx.listingDraft.update({
        where: { id },
        data: {
          matchedCatalogProductId:
            matchedCatalogProduct === undefined
              ? undefined
              : matchedCatalogProduct?.id ?? null,
          currentStep: dto.currentStep,
          searchQuery: dto.searchQuery,
          referenceImageUrl: dto.referenceImageUrl,
          targetNetAmount:
            dto.targetNetAmount !== undefined
              ? new Prisma.Decimal(dto.targetNetAmount)
              : undefined,
          askingPrice:
            askingPrice !== undefined
              ? new Prisma.Decimal(askingPrice)
              : undefined,
          shippingFeeEstimate:
            dto.shippingFeeEstimate !== undefined
              ? new Prisma.Decimal(dto.shippingFeeEstimate)
              : undefined,
          insuranceFeeEstimate: new Prisma.Decimal(insuranceFeeEstimate),
          currency: nextCurrency,
          locationProvince: dto.locationProvince,
          locationCity: dto.locationCity,
          deliveryMethods: dto.deliveryMethods,
          insuranceSelected: dto.insuranceSelected,
          hasFunctionalityVideo: hasVideo
        },
        include: PRODUCT_DRAFT_INCLUDE
      });
    });
  }

  async publishDraft(id: string, userId: string, dto: PublishListingDraftDto) {
    const draft = await this.getDraftById(id, userId);

    if (draft.status !== ListingDraftStatus.OPEN) {
      throw new BadRequestException("Draft is no longer open");
    }

    const settings = await this.platformSettingsService.getSettings();
    const product = draft.product;
    const imageMedia = product.media.filter((media) => media.type === ProductMediaType.IMAGE);
    const videoMedia = product.media.filter((media) => media.type === ProductMediaType.VIDEO);
    const title = product.title?.trim();
    const category = product.category?.trim();
    const description = product.description?.trim();
    const condition = product.condition;
    const askingPrice = draft.askingPrice ? Number(draft.askingPrice) : undefined;
    const province = dto.locationProvince ?? draft.locationProvince;
    const city = dto.locationCity ?? draft.locationCity;

    if (!title || !category || !description || !condition || !province || !city) {
      throw new BadRequestException("Completá la ficha del producto antes de publicar.");
    }

    if (imageMedia.length < 4) {
      throw new BadRequestException("Necesitás al menos 4 fotos para publicar.");
    }

    if (!askingPrice || askingPrice <= 0) {
      throw new BadRequestException("Definí un precio de publicación válido.");
    }

    if (!draft.deliveryMethods.length) {
      throw new BadRequestException("Elegí al menos un modo de entrega.");
    }

    const currency = await this.getAllowedCurrency(draft.currency);
    const autoTags = buildAutoTags({
      title,
      category,
      brand: product.brand ?? undefined,
      locationCity: city,
      condition,
      year: product.manufactureYear ?? undefined,
      technicalSpecs: product.technicalSpecs
    });
    const marketTags = buildMarketTags({
      condition,
      invoiceVerified: product.invoiceVerified,
      price: askingPrice,
      aiSuggestedPrice: extractSuggestedPrice(product.technicalSpecs)
    });
    const slug = buildListingSlug(title, condition, city);

    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          sellerId: userId,
          productId: product.id,
          title,
          slug,
          description,
          category,
          condition,
          status: ListingStatus.PUBLISHED,
          price: new Prisma.Decimal(askingPrice),
          currency,
          locationProvince: province,
          locationCity: city,
          autoTags,
          marketTags,
          aiSuggestedPrice: extractSuggestedPrice(product.technicalSpecs)
            ? new Prisma.Decimal(String(extractSuggestedPrice(product.technicalSpecs)))
            : undefined,
          publishedAt: new Date(),
          images: {
            create: imageMedia.map((media, index) => ({
              url: media.url,
              sortOrder: index
            }))
          }
        },
        include: {
          images: {
            orderBy: {
              sortOrder: "asc"
            }
          }
        }
      });

      await tx.product.update({
        where: { id: product.id },
        data: {
          slugBase: slugify(title),
          searchTags: autoTags,
          marketTags,
          transparencyBadge:
            product.invoiceVerified ||
            Boolean(product.serialNumber) ||
            Boolean(product.imei),
          visionSummary: {
            ...(product.visionSummary as Record<string, unknown> | null),
            hasFunctionalityVideo: videoMedia.length > 0,
            minimumPhotoRequirementMet: imageMedia.length >= 4,
            estimatedSellerNet: calculateNetFromAskingPrice(
              askingPrice,
              Number(settings.sellerCommissionPercentage)
            )
          }
        }
      });

      return tx.listingDraft.update({
        where: { id },
        data: {
          status: ListingDraftStatus.PUBLISHED,
          currentStep: ListingDraftStep.REVIEW,
          publishedListingId: listing.id
        },
        include: PRODUCT_DRAFT_INCLUDE
      });
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
      ...(query.category
        ? {
            category: {
              equals: query.category,
              mode: "insensitive"
            }
          }
        : {}),
      ...((query.minPrice !== undefined || query.maxPrice !== undefined)
        ? {
            price: {
              ...(query.minPrice !== undefined
                ? { gte: new Prisma.Decimal(query.minPrice) }
                : {}),
              ...(query.maxPrice !== undefined
                ? { lte: new Prisma.Decimal(query.maxPrice) }
                : {})
            }
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
              { category: { contains: query.q, mode: "insensitive" } },
              { locationCity: { contains: query.q, mode: "insensitive" } },
              { locationProvince: { contains: query.q, mode: "insensitive" } },
              { autoTags: { has: query.q.toLowerCase() } },
              { marketTags: { has: query.q.toLowerCase() } },
              {
                product: {
                  OR: [
                    { brand: { contains: query.q, mode: "insensitive" } },
                    { model: { contains: query.q, mode: "insensitive" } },
                    { searchTags: { has: query.q.toLowerCase() } }
                  ]
                }
              },
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
              publicSerial: true,
              firstName: true,
              lastName: true,
              city: true,
              province: true,
              reputationScore: true,
              kycStatus: true
            }
          },
          product: {
            select: {
              brand: true,
              model: true,
              manufactureYear: true,
              technicalSpecs: true,
              transparencyBadge: true,
              marketTags: true,
              searchTags: true
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

  async getListingById(idOrSlug: string) {
    const listing = await this.prisma.listing.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }]
      },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc"
          }
        },
        seller: true,
        product: {
          include: {
            media: {
              orderBy: {
                sortOrder: "asc"
              }
            },
            catalogProduct: true
          }
        },
        escrows: {
          include: {
            buyer: {
              select: {
                id: true,
                publicSerial: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            seller: {
              select: {
                id: true,
                publicSerial: true,
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
      throw new NotFoundException(`Listing ${idOrSlug} not found`);
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

      const updated = await tx.listing.update({
        where: { id },
        data: {
          title: dto.title,
          slug: dto.title ? buildListingSlug(dto.title, dto.condition ?? listing.condition, dto.locationCity ?? listing.locationCity) : undefined,
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

      if (listing.productId) {
        await tx.product.update({
          where: { id: listing.productId },
          data: {
            title: dto.title,
            slugBase: dto.title ? slugify(dto.title) : undefined,
            category: dto.category,
            description: dto.description,
            condition: dto.condition,
            searchTags:
              dto.title || dto.category || dto.locationCity || dto.condition
                ? buildAutoTags({
                    title: dto.title ?? updated.title,
                    category: dto.category ?? updated.category,
                    brand: inferBrandFromTitle(dto.title ?? updated.title),
                    locationCity: dto.locationCity ?? updated.locationCity,
                    condition: dto.condition ?? updated.condition
                  })
                : undefined
          }
        });
      }

      return updated;
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

function normalizeCatalogSearchInput(query?: string, referenceImageUrl?: string) {
  const normalizedQuery = query?.trim();

  if (normalizedQuery) {
    return normalizedQuery;
  }

  if (!referenceImageUrl) {
    return "";
  }

  const filename = referenceImageUrl.split("/").pop() ?? "";
  return filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function buildListingSlug(title: string, condition: ListingCondition, city: string) {
  return slugify(`${title}-${condition}-${city}`);
}

function inferBrandFromTitle(title: string) {
  return title.trim().split(/\s+/)[0] || null;
}

function buildAutoTags(input: {
  title: string;
  category?: string | null;
  brand?: string | null;
  locationCity?: string | null;
  condition?: ListingCondition | null;
  year?: number;
  technicalSpecs?: unknown;
}) {
  const candidates = [
    input.title,
    input.category,
    input.brand,
    input.locationCity,
    input.condition,
    input.year ? String(input.year) : null,
    ...(extractSpecValues(input.technicalSpecs).slice(0, 5))
  ];

  return Array.from(
    new Set(
      candidates
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim().toLowerCase())
    )
  );
}

function buildMarketTags(input: {
  condition?: ListingCondition | null;
  invoiceVerified?: boolean;
  price?: number;
  aiSuggestedPrice?: number;
}) {
  const tags: string[] = [];

  if (input.invoiceVerified) {
    tags.push("unico-dueno");
  }

  if (input.condition === ListingCondition.LIKE_NEW || input.condition === ListingCondition.VERY_GOOD) {
    tags.push("estado-destacado");
  }

  if (
    input.price &&
    input.aiSuggestedPrice &&
    input.aiSuggestedPrice > 0 &&
    input.price <= input.aiSuggestedPrice * 0.8
  ) {
    tags.push("oportunidad");
  }

  return tags;
}

function analyzeMediaUrl(url: string, type: ProductMediaType) {
  if (type === ProductMediaType.VIDEO) {
    return {
      aiBlurDetected: false,
      aiNoisyBackground: false,
      aiVisibleDamage: false,
      aiQualityScore: 92,
      aiSuggestion: "Video funcional detectado. Mejora la confianza de la publicación."
    };
  }

  const normalized = url.toLowerCase();
  const aiBlurDetected = normalized.includes("blur") || normalized.includes("borrosa");
  const aiNoisyBackground = normalized.includes("room") || normalized.includes("messy");
  const aiVisibleDamage =
    normalized.includes("scratch") ||
    normalized.includes("rayon") ||
    normalized.includes("damage") ||
    normalized.includes("detalle");
  const aiQualityScore = Math.max(
    48,
    92 - Number(aiBlurDetected) * 20 - Number(aiNoisyBackground) * 10 - Number(aiVisibleDamage) * 12
  );

  return {
    aiBlurDetected,
    aiNoisyBackground,
    aiVisibleDamage,
    aiQualityScore,
    aiSuggestion: buildMediaSuggestion({
      aiBlurDetected,
      aiNoisyBackground,
      aiVisibleDamage
    })
  };
}

function buildMediaSuggestion(input: {
  aiBlurDetected: boolean;
  aiNoisyBackground: boolean;
  aiVisibleDamage: boolean;
}) {
  if (input.aiVisibleDamage) {
    return "Detectamos un posible detalle visible. Podés mencionarlo en el estado para generar confianza.";
  }

  if (input.aiBlurDetected) {
    return "La imagen parece algo borrosa. Sumá una toma más nítida para mejorar la conversión.";
  }

  if (input.aiNoisyBackground) {
    return "El fondo compite con el producto. Si podés, sumá una foto más limpia.";
  }

  return "La imagen aporta buena legibilidad para la publicación.";
}

function buildVisionSummary(
  media: Array<{
    url: string;
    type: "IMAGE" | "VIDEO" | ProductMediaType;
  }>
) {
  const analyzed = media.map((item) =>
    analyzeMediaUrl(item.url, item.type as ProductMediaType)
  );
  const imageCount = media.filter((item) => item.type === "IMAGE").length;
  const videoCount = media.filter((item) => item.type === "VIDEO").length;

  return {
    imageCount,
    videoCount,
    minimumPhotoRequirementMet: imageCount >= 4,
    hasFunctionalityVideo: videoCount > 0,
    blurDetected: analyzed.some((item) => item.aiBlurDetected),
    noisyBackgroundDetected: analyzed.some((item) => item.aiNoisyBackground),
    visibleDamageDetected: analyzed.some((item) => item.aiVisibleDamage),
    suggestions: analyzed
      .map((item) => item.aiSuggestion)
      .filter((value): value is string => Boolean(value))
  };
}

function extractSpecValues(specs: unknown) {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
    return [];
  }

  return Object.values(specs)
    .flatMap((value) =>
      typeof value === "string" || typeof value === "number" ? [String(value)] : []
    )
    .map((value) => value.toLowerCase());
}

function extractSuggestedPrice(specs: unknown) {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
    return undefined;
  }

  const raw = (specs as Record<string, unknown>).suggestedPrice;
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function toPrismaJson(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function shouldOfferInsurance(
  category?: string | null,
  price?: number,
  currency?: CurrencyCode
) {
  if (!category || !price || currency !== CurrencyCode.ARS) {
    return false;
  }

  const normalizedCategory = category.toLowerCase();
  const insuredCategories = ["electronica", "fotografia", "computacion", "celulares", "tecnologia"];

  return insuredCategories.some((item) => normalizedCategory.includes(item)) && price >= 150_000;
}

function calculateInsuranceEstimate(price: number) {
  return Number((price * 0.015).toFixed(2));
}

function calculateAskingPriceFromNet(targetNetAmount: number, sellerCommissionPercentage: number) {
  const divisor = 1 - sellerCommissionPercentage / 100;

  if (divisor <= 0) {
    return targetNetAmount;
  }

  return Number((targetNetAmount / divisor).toFixed(2));
}

function calculateNetFromAskingPrice(askingPrice: number, sellerCommissionPercentage: number) {
  return Number((askingPrice * (1 - sellerCommissionPercentage / 100)).toFixed(2));
}
