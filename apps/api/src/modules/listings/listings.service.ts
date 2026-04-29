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
    const baseWhere: Prisma.ListingWhereInput = {
      sellerId: query.sellerId,
      status: query.status
    };
    const candidates = await this.prisma.listing.findMany({
      where: baseWhere,
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
      take: query.q ? 240 : 180
    });

    const rankedCandidates = rankListings(candidates, query.q, sortBy, query.sortOrder);
    const facetSourceItems = rankedCandidates.filter((item) =>
      matchesListingFilters(item, {
        category: query.category,
        currency: query.currency
      })
    );
    const filteredItems = facetSourceItems.filter((item) =>
      matchesListingFilters(item, {
        category: query.category,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        condition: query.condition,
        currency: query.currency,
        brand: query.brand,
        year: query.year,
        specKey: query.specKey,
        specValue: query.specValue,
        shutterCount: query.shutterCount,
        batteryHealth: query.batteryHealth,
        storage: query.storage,
        memory: query.memory,
        wheelSize: query.wheelSize
      })
    );
    const total = filteredItems.length;
    const items = filteredItems.slice(pagination.skip, pagination.skip + pagination.take);

    return {
      items,
      facets: buildListingFacets(facetSourceItems),
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

type SearchableListing = Prisma.ListingGetPayload<{
  include: {
    images: true;
    seller: {
      select: {
        id: true;
        publicSerial: true;
        firstName: true;
        lastName: true;
        city: true;
        province: true;
        reputationScore: true;
        kycStatus: true;
      };
    };
    product: {
      select: {
        brand: true;
        model: true;
        manufactureYear: true;
        technicalSpecs: true;
        transparencyBadge: true;
        marketTags: true;
        searchTags: true;
      };
    };
    _count: {
      select: {
        escrows: true;
      };
    };
  };
}>;

type ListingFacetOption = {
  value: string;
  label: string;
  count: number;
};

type ListingFacetGroup = {
  key: string;
  label: string;
  options: ListingFacetOption[];
};

function rankListings(
  items: SearchableListing[],
  query: string | undefined,
  sortBy: string,
  sortOrder?: string
) {
  if (!query?.trim()) {
    return sortListingsByField(items, sortBy, sortOrder);
  }

  return items
    .map((item) => ({
      item,
      score: scoreListingSearch(item, query)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return compareListings(right.item, left.item, "publishedAt", "desc");
    })
    .map((entry) => entry.item);
}

function sortListingsByField(
  items: SearchableListing[],
  sortBy: string,
  sortOrder?: string
) {
  const direction = getSortOrder(sortOrder) === "asc" ? "asc" : "desc";

  return [...items].sort((left, right) =>
    compareListings(left, right, sortBy, direction)
  );
}

function compareListings(
  left: SearchableListing,
  right: SearchableListing,
  sortBy: string,
  direction: "asc" | "desc"
) {
  const factor = direction === "asc" ? 1 : -1;

  if (sortBy === "price") {
    return (Number(left.price) - Number(right.price)) * factor;
  }

  if (sortBy === "title" || sortBy === "status") {
    return left[sortBy].localeCompare(right[sortBy]) * factor;
  }

  const leftTime = new Date(String(left[sortBy as keyof SearchableListing] ?? 0)).getTime();
  const rightTime = new Date(String(right[sortBy as keyof SearchableListing] ?? 0)).getTime();

  return (leftTime - rightTime) * factor;
}

function scoreListingSearch(item: SearchableListing, query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return 0;
  }

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const title = normalizeText(item.title);
  const description = normalizeText(item.description);
  const category = normalizeText(item.category);
  const brand = normalizeText(item.product?.brand ?? inferBrandFromTitle(item.title));
  const model = normalizeText(item.product?.model);
  const location = normalizeText(`${item.locationCity} ${item.locationProvince}`);
  const tags = [
    ...(item.autoTags ?? []),
    ...(item.marketTags ?? []),
    ...(item.product?.searchTags ?? []),
    ...(item.product?.marketTags ?? [])
  ].map(normalizeText);
  const specs = Object.values((item.product?.technicalSpecs ?? {}) as Record<string, unknown>)
    .map((value) => normalizeText(String(value)));
  const searchCorpus = [title, description, category, brand, model, location, ...tags, ...specs].join(" ");
  let score = 0;

  if (title.includes(normalizedQuery)) {
    score += 140;
  }

  if (brand.includes(normalizedQuery) || model.includes(normalizedQuery)) {
    score += 110;
  }

  if (category.includes(normalizedQuery)) {
    score += 70;
  }

  if (description.includes(normalizedQuery)) {
    score += 35;
  }

  for (const token of tokens) {
    if (title.includes(token)) score += 34;
    if (brand.includes(token) || model.includes(token)) score += 24;
    if (category.includes(token)) score += 16;
    if (description.includes(token)) score += 10;
    if (location.includes(token)) score += 8;
    if (tags.some((tag) => tag.includes(token))) score += 12;
    if (specs.some((spec) => spec.includes(token))) score += 10;
  }

  const fuzzyTargets = new Set(
    [title, brand, model, category, ...tags]
      .flatMap((value) => value.split(" "))
      .filter(Boolean)
  );

  for (const token of tokens) {
    const bestSimilarity = Math.max(
      0,
      ...Array.from(fuzzyTargets).map((target) => similarityScore(token, target))
    );

    if (bestSimilarity >= 0.92) score += 22;
    else if (bestSimilarity >= 0.82) score += 16;
    else if (bestSimilarity >= 0.74) score += 10;
    else if (bestSimilarity >= 0.66) score += 22;
  }

  score += scoreIntentMatch(item, normalizedQuery);

  return searchCorpus.includes(normalizedQuery) || score >= 18 ? score : 0;
}

function scoreIntentMatch(item: SearchableListing, normalizedQuery: string) {
  const category = normalizeText(item.category);
  const title = normalizeText(item.title);
  let score = 0;

  const intentRules = [
    {
      triggers: ["fotografia", "bodas", "camara", "mirrorless", "video profesional"],
      matches: ["fotografia", "camara", "sony", "lente"]
    },
    {
      triggers: ["gaming", "consola", "fifa", "play"],
      matches: ["gaming", "playstation", "ps5", "xbox"]
    },
    {
      triggers: ["notebook", "trabajo", "estudio", "laptop"],
      matches: ["computacion", "macbook", "notebook", "ssd"]
    },
    {
      triggers: ["celular", "smartphone", "iphone", "android"],
      matches: ["celulares", "iphone", "samsung", "galaxy"]
    }
  ];

  for (const rule of intentRules) {
    const triggered = rule.triggers.some((trigger) => normalizedQuery.includes(trigger));

    if (!triggered) {
      continue;
    }

    if (rule.matches.some((match) => category.includes(match) || title.includes(match))) {
      score += 28;
    }
  }

  return score;
}

function matchesListingFilters(
  item: SearchableListing,
  filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    currency?: string;
    brand?: string;
    year?: number;
    specKey?: string;
    specValue?: string;
    shutterCount?: string;
    batteryHealth?: string;
    storage?: string;
    memory?: string;
    wheelSize?: string;
  }
) {
  if (
    filters.category &&
    normalizeText(item.category) !== normalizeText(filters.category)
  ) {
    return false;
  }

  if (filters.condition && item.condition !== filters.condition) {
    return false;
  }

  if (filters.currency && item.currency !== filters.currency) {
    return false;
  }

  if (
    filters.brand &&
    normalizeText(item.product?.brand ?? inferBrandFromTitle(item.title)) !== normalizeText(filters.brand)
  ) {
    return false;
  }

  if (
    filters.year !== undefined &&
    item.product?.manufactureYear !== filters.year
  ) {
    return false;
  }

  const price = Number(item.price);

  if (filters.minPrice !== undefined && price < filters.minPrice) {
    return false;
  }

  if (filters.maxPrice !== undefined && price > filters.maxPrice) {
    return false;
  }

  if (filters.specKey && filters.specValue) {
    const specs = (item.product?.technicalSpecs ?? {}) as Record<string, unknown>;
    const rawValue = specs[filters.specKey];

    if (!rawValue || normalizeText(String(rawValue)) !== normalizeText(filters.specValue)) {
      return false;
    }
  }

  const categorySpecFilters = [
    ["shutterCount", filters.shutterCount],
    ["batteryHealth", filters.batteryHealth],
    ["storage", filters.storage],
    ["memory", filters.memory],
    ["wheelSize", filters.wheelSize]
  ] as const;

  if (
    categorySpecFilters.some(([key, value]) => {
      if (!value) {
        return false;
      }

      const specs = (item.product?.technicalSpecs ?? {}) as Record<string, unknown>;
      const rawValue = specs[key];
      return !rawValue || normalizeText(String(rawValue)) !== normalizeText(value);
    })
  ) {
    return false;
  }

  return true;
}

function buildListingFacets(items: SearchableListing[]) {
  const categories = countFacetOptions(items, (item) => item.category);
  const conditions = countFacetOptions(items, (item) => item.condition, getConditionFacetLabel);
  const brands = countFacetOptions(
    items,
    (item) => item.product?.brand ?? inferBrandFromTitle(item.title) ?? ""
  );
  const currencies = countFacetOptions(items, (item) => item.currency);
  const years = countFacetOptions(
    items,
    (item) => String(item.product?.manufactureYear ?? ""),
    (value) => value
  );
  const dynamicSpecs = buildDynamicSpecFacets(items);

  return {
    categories,
    conditions,
    brands,
    currencies,
    years,
    dynamicSpecs
  };
}

function countFacetOptions(
  items: SearchableListing[],
  getValue: (item: SearchableListing) => string,
  getLabel?: (value: string) => string
) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const value = getValue(item).trim();

    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({
      value,
      label: getLabel ? getLabel(value) : value,
      count
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 12);
}

function buildDynamicSpecFacets(items: SearchableListing[]): ListingFacetGroup[] {
  const specCounters = new Map<
    string,
    Map<string, number>
  >();

  for (const item of items) {
    const specs = (item.product?.technicalSpecs ?? {}) as Record<string, unknown>;

    for (const [key, rawValue] of Object.entries(specs)) {
      if (rawValue === null || rawValue === undefined || key === "suggestedPrice") {
        continue;
      }

      const value = String(rawValue).trim();

      if (!value) {
        continue;
      }

      const values = specCounters.get(key) ?? new Map<string, number>();
      values.set(value, (values.get(value) ?? 0) + 1);
      specCounters.set(key, values);
    }
  }

  return Array.from(specCounters.entries())
    .map(([key, values]) => ({
      key,
      label: specFacetLabel(key),
      options: Array.from(values.entries())
        .map(([value, count]) => ({
          value,
          label: value,
          count
        }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    }))
    .filter((group) => group.options.length >= 1)
    .sort((left, right) => right.options.length - left.options.length)
    .slice(0, 4);
}

function getConditionFacetLabel(value: string) {
  const labels: Record<string, string> = {
    LIKE_NEW: "Como nuevo",
    VERY_GOOD: "Muy bueno",
    GOOD: "Bueno",
    FAIR: "Para repuestos / con detalles"
  };

  return labels[value] ?? value;
}

function specFacetLabel(key: string) {
  const labels: Record<string, string> = {
    sensor: "Sensor",
    video: "Video",
    weight: "Peso",
    storage: "Almacenamiento",
    memory: "Memoria",
    batteryHealth: "Batería",
    shutterCount: "Disparos",
    wheelSize: "Rodado",
    screen: "Pantalla",
    chipset: "Chipset",
    launchYear: "Año de lanzamiento"
  };

  return labels[key] ?? key;
}

function similarityScore(left: string, right: string) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);
  const overlap = leftBigrams.filter((bigram) => rightBigrams.includes(bigram)).length;

  return (2 * overlap) / (leftBigrams.length + rightBigrams.length || 1);
}

function buildBigrams(value: string) {
  const normalized = normalizeText(value);

  if (normalized.length <= 2) {
    return [normalized];
  }

  const output: string[] = [];

  for (let index = 0; index < normalized.length - 1; index += 1) {
    output.push(normalized.slice(index, index + 2));
  }

  return output;
}

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
  const normalizedTitle = normalizeText(title);

  if (normalizedTitle.includes("iphone") || normalizedTitle.includes("macbook")) {
    return "Apple";
  }

  if (normalizedTitle.includes("playstation") || normalizedTitle.includes("ps5")) {
    return "Sony";
  }

  if (normalizedTitle.includes("garmin")) {
    return "Garmin";
  }

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
