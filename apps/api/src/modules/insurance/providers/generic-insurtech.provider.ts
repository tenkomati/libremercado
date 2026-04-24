import {
  InsurancePolicyStatus,
  InsuranceProvider,
  Prisma
} from "@prisma/client";

import {
  BaseInsuranceProvider,
  InsuranceQuoteResult,
  InsuranceWebhookResult,
  IssueInsurancePolicyInput,
  IssueInsurancePolicyResult
} from "./base-insurance-provider";

export class GenericInsurtechProvider extends BaseInsuranceProvider {
  private readonly minAmount = new Prisma.Decimal(
    process.env.INSURANCE_MIN_AMOUNT_ARS ?? "150000"
  );
  private readonly ratePercentage = new Prisma.Decimal(
    process.env.INSURANCE_PREMIUM_PERCENTAGE ?? "1.5"
  );
  private readonly eligibleCategoryKeywords = (
    process.env.INSURANCE_ELIGIBLE_CATEGORIES ??
    "electronica,fotografia,computacion,celulares,gaming,deportes"
  )
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  constructor(provider: InsuranceProvider) {
    super(provider);
  }

  async getQuote(input: {
    category: string;
    price: Prisma.Decimal;
  }): Promise<InsuranceQuoteResult> {
    const normalizedCategory = normalizeText(input.category);
    const isCategoryEligible = this.eligibleCategoryKeywords.some((keyword) =>
      normalizedCategory.includes(normalizeText(keyword))
    );

    if (!isCategoryEligible) {
      return {
        eligible: false,
        providerName: this.provider.name,
        premiumAmount: new Prisma.Decimal("0"),
        coverageAmount: input.price,
        ratePercentage: this.ratePercentage,
        reason: "Categoria no elegible para micro-seguro."
      };
    }

    if (input.price.lt(this.minAmount)) {
      return {
        eligible: false,
        providerName: this.provider.name,
        premiumAmount: new Prisma.Decimal("0"),
        coverageAmount: input.price,
        ratePercentage: this.ratePercentage,
        reason: `Monto inferior al minimo asegurable de ${this.minAmount.toString()}.`
      };
    }

    const premiumAmount = input.price.mul(this.ratePercentage).div(100);

    return {
      eligible: true,
      providerName: this.provider.name,
      premiumAmount,
      coverageAmount: input.price,
      ratePercentage: this.ratePercentage
    };
  }

  async issuePolicy(
    input: IssueInsurancePolicyInput
  ): Promise<IssueInsurancePolicyResult> {
    const externalPolicyId = `policy_${input.orderId}`;
    const policyUrl = `${this.provider.endpointApi.replace(/\/$/, "")}/policies/${externalPolicyId}`;

    return {
      externalPolicyId,
      status: InsurancePolicyStatus.ACTIVE,
      premiumAmount: input.premiumAmount,
      coverageAmount: input.insuredAmount,
      policyUrl,
      rawPayload: {
        provider: this.provider.name,
        orderId: input.orderId,
        productTitle: input.productTitle,
        category: input.category,
        insuredAmount: input.insuredAmount.toString(),
        premiumAmount: input.premiumAmount.toString(),
        buyer: {
          id: input.buyer.id,
          email: input.buyer.email,
          dni: input.buyer.dni
        }
      }
    };
  }

  normalizeWebhook(payload: Record<string, unknown>): InsuranceWebhookResult {
    return {
      eventId:
        getString(payload.eventId) ??
        getString(payload.id) ??
        `insurance_${Date.now()}`,
      externalPolicyId:
        getString(payload.externalPolicyId) ??
        getString(payload.policy_id_externo),
      orderId: getString(payload.orderId) ?? getString(payload.order_id),
      status:
        normalizeStatus(
          getString(payload.status) ?? InsurancePolicyStatus.PENDING
        ) ?? InsurancePolicyStatus.PENDING,
      policyUrl: getString(payload.policyUrl) ?? getString(payload.policy_url),
      rawPayload: payload as Prisma.InputJsonValue
    };
  }
}

function getString(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return undefined;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function normalizeStatus(value: string) {
  const normalized = value.trim().toUpperCase();

  if (normalized in InsurancePolicyStatus) {
    return InsurancePolicyStatus[normalized as keyof typeof InsurancePolicyStatus];
  }

  return undefined;
}
