import {
  InsurancePolicyStatus,
  InsuranceProvider,
  Prisma
} from "@prisma/client";

export type InsuranceQuoteResult = {
  eligible: boolean;
  providerName: string;
  premiumAmount: Prisma.Decimal;
  coverageAmount: Prisma.Decimal;
  ratePercentage: Prisma.Decimal;
  reason?: string;
};

export type IssueInsurancePolicyInput = {
  orderId: string;
  productTitle: string;
  category: string;
  insuredAmount: Prisma.Decimal;
  premiumAmount: Prisma.Decimal;
  buyer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    dni: string;
    identityVerified: boolean;
  };
};

export type IssueInsurancePolicyResult = {
  externalPolicyId: string;
  status: InsurancePolicyStatus;
  premiumAmount: Prisma.Decimal;
  coverageAmount: Prisma.Decimal;
  policyUrl: string;
  rawPayload: Prisma.InputJsonValue;
};

export type InsuranceWebhookResult = {
  eventId: string;
  externalPolicyId?: string;
  orderId?: string;
  status: InsurancePolicyStatus;
  policyUrl?: string;
  rawPayload: Prisma.InputJsonValue;
};

export abstract class BaseInsuranceProvider {
  constructor(protected readonly provider: InsuranceProvider) {}

  abstract getQuote(input: {
    category: string;
    price: Prisma.Decimal;
  }): Promise<InsuranceQuoteResult>;

  abstract issuePolicy(
    input: IssueInsurancePolicyInput
  ): Promise<IssueInsurancePolicyResult>;

  abstract normalizeWebhook(
    payload: Record<string, unknown>
  ): InsuranceWebhookResult;
}
