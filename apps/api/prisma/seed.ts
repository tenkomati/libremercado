import {
  CurrencyCode,
  EscrowEventType,
  EscrowStatus,
  KycDocumentType,
  KycStatus,
  ListingCondition,
  ListingStatus,
  Prisma,
  PrismaClient,
  UserRole,
  UserStatus
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

type SeedUser = {
  key: string;
  email: string;
  dni: string;
  firstName: string;
  lastName: string;
  phone: string;
  province: string;
  city: string;
  status: UserStatus;
  role: UserRole;
  kycStatus: KycStatus;
  reputationScore: string;
  password: string;
  provider?: string;
  documentType?: KycDocumentType;
  reviewerNotes?: string;
};

type SeedListing = {
  key: string;
  sellerKey: string;
  title: string;
  description: string;
  category: string;
  condition: ListingCondition;
  status: ListingStatus;
  price: string;
  currency?: CurrencyCode;
  locationProvince: string;
  locationCity: string;
  aiSuggestedPrice?: string;
  publishedAt?: Date;
  images: string[];
};

const users: SeedUser[] = [
  {
    key: "seller-premium",
    email: "sofia.romero@libremercado.test",
    dni: "30111222",
    firstName: "Sofia",
    lastName: "Romero",
    phone: "+5491162457788",
    province: "Buenos Aires",
    city: "La Plata",
    status: UserStatus.ACTIVE,
    role: UserRole.ADMIN,
    kycStatus: KycStatus.APPROVED,
    reputationScore: "4.96",
    password: "Admin12345!",
    provider: "mati",
    documentType: KycDocumentType.DNI,
    reviewerNotes: "Identidad verificada con match biometrico alto."
  },
  {
    key: "seller-tech",
    email: "martin.farias@libremercado.test",
    dni: "28999888",
    firstName: "Martin",
    lastName: "Farias",
    phone: "+5491151248877",
    province: "Cordoba",
    city: "Cordoba",
    status: UserStatus.ACTIVE,
    role: UserRole.USER,
    kycStatus: KycStatus.APPROVED,
    reputationScore: "4.88",
    password: "Seller12345!",
    provider: "renaper",
    documentType: KycDocumentType.DNI,
    reviewerNotes: "Validacion automatica aprobada."
  },
  {
    key: "buyer-frequent",
    email: "valentina.mendez@libremercado.test",
    dni: "33222444",
    firstName: "Valentina",
    lastName: "Mendez",
    phone: "+5491139982200",
    province: "Ciudad Autonoma de Buenos Aires",
    city: "Palermo",
    status: UserStatus.ACTIVE,
    role: UserRole.USER,
    kycStatus: KycStatus.APPROVED,
    reputationScore: "4.91",
    password: "Buyer12345!",
    provider: "mati",
    documentType: KycDocumentType.DNI,
    reviewerNotes: "Usuario recurrente con documentos consistentes."
  },
  {
    key: "buyer-interior",
    email: "lucas.pereyra@libremercado.test",
    dni: "31777111",
    firstName: "Lucas",
    lastName: "Pereyra",
    phone: "+5493516628899",
    province: "Mendoza",
    city: "Godoy Cruz",
    status: UserStatus.ACTIVE,
    role: UserRole.USER,
    kycStatus: KycStatus.APPROVED,
    reputationScore: "4.79",
    password: "Buyer12345!",
    provider: "renaper",
    documentType: KycDocumentType.DNI,
    reviewerNotes: "KYC aprobado luego de validacion manual."
  },
  {
    key: "seller-review",
    email: "camila.arias@libremercado.test",
    dni: "34111888",
    firstName: "Camila",
    lastName: "Arias",
    phone: "+5491120024411",
    province: "Santa Fe",
    city: "Rosario",
    status: UserStatus.PENDING_REVIEW,
    role: UserRole.OPS,
    kycStatus: KycStatus.REQUIRES_REVIEW,
    reputationScore: "3.85",
    password: "Ops12345!",
    provider: "mati",
    documentType: KycDocumentType.DNI,
    reviewerNotes: "Requiere documentacion complementaria."
  },
  {
    key: "blocked-user",
    email: "bruno.silva@libremercado.test",
    dni: "27555111",
    firstName: "Bruno",
    lastName: "Silva",
    phone: "+5491167015511",
    province: "Buenos Aires",
    city: "San Isidro",
    status: UserStatus.BLOCKED,
    role: UserRole.USER,
    kycStatus: KycStatus.REJECTED,
    reputationScore: "1.25",
    password: "Blocked12345!",
    provider: "mati",
    documentType: KycDocumentType.DNI,
    reviewerNotes: "Inconsistencias entre selfie y documento."
  }
];

const listings: SeedListing[] = [
  {
    key: "iphone-15",
    sellerKey: "seller-premium",
    title: "iPhone 15 Pro 256 GB Titanio Natural",
    description:
      "Equipo en excelente estado, siempre usado con funda y vidrio. Bateria al 96%, caja original y cable USB-C incluidos. Ideal para quien busca gama alta sin pagar precio retail.",
    category: "Celulares",
    condition: ListingCondition.LIKE_NEW,
    status: ListingStatus.PUBLISHED,
    price: "1450000",
    currency: CurrencyCode.ARS,
    aiSuggestedPrice: "1490000",
    locationProvince: "Buenos Aires",
    locationCity: "La Plata",
    publishedAt: new Date("2026-03-14T15:00:00.000Z"),
    images: [
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    key: "macbook-air",
    sellerKey: "seller-tech",
    title: "MacBook Air M2 13 pulgadas 16 GB RAM",
    description:
      "Notebook liviana para trabajo y estudio, con 16 GB de RAM y SSD de 512 GB. Sin golpes, teclado impecable y ciclo de bateria saludable.",
    category: "Computacion",
    condition: ListingCondition.VERY_GOOD,
    status: ListingStatus.PUBLISHED,
    price: "1650",
    currency: CurrencyCode.USD,
    aiSuggestedPrice: "1700",
    locationProvince: "Cordoba",
    locationCity: "Cordoba",
    publishedAt: new Date("2026-03-11T18:30:00.000Z"),
    images: [
      "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    key: "playstation-5",
    sellerKey: "seller-premium",
    title: "PlayStation 5 Slim + 2 joysticks + FIFA",
    description:
      "Consola comprada en 2025, poco uso y funcionamiento perfecto. Incluye dos joysticks originales, cableado completo y juego fisico.",
    category: "Gaming",
    condition: ListingCondition.VERY_GOOD,
    status: ListingStatus.RESERVED,
    price: "920000",
    currency: CurrencyCode.ARS,
    aiSuggestedPrice: "899000",
    locationProvince: "Buenos Aires",
    locationCity: "La Plata",
    publishedAt: new Date("2026-03-10T13:00:00.000Z"),
    images: [
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    key: "silla-ergonomica",
    sellerKey: "seller-tech",
    title: "Silla ergonomica mesh con apoyo lumbar",
    description:
      "Silla para home office con apoyabrazos regulables, respaldo respirable y ruedas siliconadas. Se entrega armada.",
    category: "Hogar y Muebles",
    condition: ListingCondition.GOOD,
    status: ListingStatus.PUBLISHED,
    price: "210000",
    currency: CurrencyCode.ARS,
    aiSuggestedPrice: "198000",
    locationProvince: "Cordoba",
    locationCity: "Cordoba",
    publishedAt: new Date("2026-03-09T11:00:00.000Z"),
    images: [
      "https://images.unsplash.com/photo-1505843490701-5be5d2b4b1a4?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    key: "campera-patagonia",
    sellerKey: "seller-premium",
    title: "Campera Patagonia impermeable talle M",
    description:
      "Campera original con muy poco uso, ideal para lluvia y trekking urbano. Cierres en perfecto estado.",
    category: "Moda",
    condition: ListingCondition.LIKE_NEW,
    status: ListingStatus.PUBLISHED,
    price: "185000",
    currency: CurrencyCode.ARS,
    aiSuggestedPrice: "192500",
    locationProvince: "Buenos Aires",
    locationCity: "La Plata",
    publishedAt: new Date("2026-03-08T16:15:00.000Z"),
    images: [
      "https://images.unsplash.com/photo-1548883354-94bcfe321cbb?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    key: "bici-gravel",
    sellerKey: "seller-review",
    title: "Bicicleta gravel aluminio rodado 28",
    description:
      "Cuadro aluminio, transmision 2x10 y frenos a disco. Lista para salidas largas. Publicacion retenida hasta completar validacion del vendedor.",
    category: "Deportes",
    condition: ListingCondition.GOOD,
    status: ListingStatus.UNDER_REVIEW,
    price: "850",
    currency: CurrencyCode.USD,
    aiSuggestedPrice: "900",
    locationProvince: "Santa Fe",
    locationCity: "Rosario",
    images: [
      "https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1200&q=80"
    ]
  }
];

async function main() {
  await prisma.adminAuditLog.deleteMany();
  await prisma.userNotification.deleteMany();
  await prisma.escrowMessage.deleteMany();
  await prisma.escrowAvailabilitySlot.deleteMany();
  await prisma.escrowDeliveryProposal.deleteMany();
  await prisma.escrowMeetingProposal.deleteMany();
  await prisma.paymentEvent.deleteMany();
  await prisma.paymentIntent.deleteMany();
  await prisma.escrowEvent.deleteMany();
  await prisma.escrowTransaction.deleteMany();
  await prisma.listingImage.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.kycVerification.deleteMany();
  await prisma.platformSettings.deleteMany();
  await prisma.user.deleteMany();

  await prisma.platformSettings.create({
    data: {
      id: "global",
      sellerCommissionPercentage: new Prisma.Decimal("5.00"),
      buyerCommissionPercentage: new Prisma.Decimal("0.00"),
      fixedListingFee: new Prisma.Decimal("0.00"),
      fixedTransactionFee: new Prisma.Decimal("0.00"),
      defaultCurrency: CurrencyCode.ARS,
      allowUsdListings: true
    }
  });

  const userMap = new Map<string, string>();
  const listingMap = new Map<string, string>();

  for (const user of users) {
    const passwordHash = await hash(user.password, 12);

    const createdUser = await prisma.user.create({
      data: {
        email: user.email,
        dni: user.dni,
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        province: user.province,
        city: user.city,
        status: user.status,
        role: user.role,
        kycStatus: user.kycStatus,
        reputationScore: new Prisma.Decimal(user.reputationScore)
      }
    });

    userMap.set(user.key, createdUser.id);

    if (user.provider && user.documentType) {
      await prisma.kycVerification.create({
        data: {
          userId: createdUser.id,
          provider: user.provider,
          documentType: user.documentType,
          documentNumber: user.dni,
          status: user.kycStatus,
          reviewerNotes: user.reviewerNotes,
          reviewedAt:
            user.kycStatus === KycStatus.PENDING ? null : new Date("2026-03-15T12:00:00.000Z"),
          riskScore:
            user.kycStatus === KycStatus.REJECTED
              ? new Prisma.Decimal("82.10")
              : new Prisma.Decimal("8.40"),
          faceMatchScore:
            user.kycStatus === KycStatus.REJECTED
              ? new Prisma.Decimal("41.25")
              : new Prisma.Decimal("97.90")
        }
      });
    }
  }

  for (const listing of listings) {
    const sellerId = userMap.get(listing.sellerKey);

    if (!sellerId) {
      throw new Error(`Missing seller for listing ${listing.key}`);
    }

    const createdListing = await prisma.listing.create({
      data: {
        sellerId,
        title: listing.title,
        description: listing.description,
        category: listing.category,
        condition: listing.condition,
        status: listing.status,
        price: new Prisma.Decimal(listing.price),
        currency: listing.currency ?? CurrencyCode.ARS,
        locationProvince: listing.locationProvince,
        locationCity: listing.locationCity,
        aiSuggestedPrice: listing.aiSuggestedPrice
          ? new Prisma.Decimal(listing.aiSuggestedPrice)
          : null,
        publishedAt: listing.publishedAt,
        images: {
          create: listing.images.map((url, index) => ({
            url,
            sortOrder: index
          }))
        }
      }
    });

    listingMap.set(listing.key, createdListing.id);
  }

  const ps5Escrow = await prisma.escrowTransaction.create({
    data: {
      listingId: listingMap.get("playstation-5")!,
      buyerId: userMap.get("buyer-frequent")!,
      sellerId: userMap.get("seller-premium")!,
      amount: new Prisma.Decimal("920000"),
      feePercentage: new Prisma.Decimal("5.00"),
      feeAmount: new Prisma.Decimal("46000"),
      netAmount: new Prisma.Decimal("874000"),
      currency: CurrencyCode.ARS,
      status: EscrowStatus.SHIPPED,
      shippingProvider: "Andreani",
      shippingTrackingCode: "AND-LM-10004599",
      shippedAt: new Date("2026-03-18T10:00:00.000Z"),
      events: {
        create: [
          {
            type: EscrowEventType.CREATED,
            payload: { channel: "marketplace", source: "seed" }
          },
          {
            type: EscrowEventType.FUNDS_HELD,
            payload: { amount: "920000.00", currency: "ARS" }
          },
          {
            type: EscrowEventType.SHIPPED,
            payload: { trackingCode: "AND-LM-10004599", provider: "Andreani" }
          }
        ]
      }
    }
  });

  await prisma.escrowTransaction.create({
    data: {
      listingId: listingMap.get("macbook-air")!,
      buyerId: userMap.get("buyer-interior")!,
      sellerId: userMap.get("seller-tech")!,
      amount: new Prisma.Decimal("1650"),
      feePercentage: new Prisma.Decimal("5.00"),
      feeAmount: new Prisma.Decimal("82.50"),
      netAmount: new Prisma.Decimal("1567.50"),
      currency: CurrencyCode.USD,
      status: EscrowStatus.DELIVERED,
      shippingProvider: "Correo Argentino",
      shippingTrackingCode: "CA-LM-2988771",
      shippedAt: new Date("2026-03-16T14:30:00.000Z"),
      deliveredAt: new Date("2026-03-18T17:20:00.000Z"),
      releaseEligibleAt: new Date("2026-03-20T17:20:00.000Z"),
      events: {
        create: [
          {
            type: EscrowEventType.CREATED,
            payload: { channel: "marketplace", source: "seed" }
          },
          {
            type: EscrowEventType.FUNDS_HELD,
            payload: { amount: "1650.00", currency: "USD" }
          },
          {
            type: EscrowEventType.SHIPPED,
            payload: { trackingCode: "CA-LM-2988771", provider: "Correo Argentino" }
          },
          {
            type: EscrowEventType.DELIVERED,
            payload: { releaseEligibleAt: "2026-03-20T17:20:00.000Z" }
          }
        ]
      }
    }
  });

  await prisma.escrowTransaction.create({
    data: {
      listingId: listingMap.get("campera-patagonia")!,
      buyerId: userMap.get("buyer-frequent")!,
      sellerId: userMap.get("seller-premium")!,
      amount: new Prisma.Decimal("185000"),
      feePercentage: new Prisma.Decimal("5.00"),
      feeAmount: new Prisma.Decimal("9250"),
      netAmount: new Prisma.Decimal("175750"),
      currency: CurrencyCode.ARS,
      status: EscrowStatus.DISPUTED,
      shippingProvider: "Pickit",
      shippingTrackingCode: "PK-LM-558201",
      shippedAt: new Date("2026-03-12T12:00:00.000Z"),
      deliveredAt: new Date("2026-03-14T15:40:00.000Z"),
      disputeReason: "La prenda recibida no coincide con las fotos publicadas.",
      events: {
        create: [
          {
            type: EscrowEventType.CREATED,
            payload: { channel: "marketplace", source: "seed" }
          },
          {
            type: EscrowEventType.FUNDS_HELD,
            payload: { amount: "185000.00", currency: "ARS" }
          },
          {
            type: EscrowEventType.SHIPPED,
            payload: { trackingCode: "PK-LM-558201", provider: "Pickit" }
          },
          {
            type: EscrowEventType.DELIVERED,
            payload: { releaseEligibleAt: "2026-03-16T15:40:00.000Z" }
          },
          {
            type: EscrowEventType.DISPUTED,
            payload: { reason: "La prenda recibida no coincide con las fotos publicadas." }
          }
        ]
      }
    }
  });

  console.log("Seed completed successfully");
  console.log(`Users: ${users.length}`);
  console.log(`Listings: ${listings.length}`);
  console.log(`Escrows: 3`);
  console.log("Admin credentials: sofia.romero@libremercado.test / Admin12345!");
  console.log(`Sample escrow id: ${ps5Escrow.id}`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
