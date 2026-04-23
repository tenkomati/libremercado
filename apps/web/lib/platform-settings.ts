import { apiFetch } from "./api";

export type PlatformSettings = {
  sellerCommissionPercentage: string;
  buyerCommissionPercentage: string;
  fixedListingFee: string;
  fixedTransactionFee: string;
  defaultCurrency: "ARS" | "USD";
  allowUsdListings: boolean;
  updatedAt?: string;
};

export async function getPlatformSettings() {
  return apiFetch<PlatformSettings>("/platform-settings");
}

export function calculateSellerNetAmount(
  price: number,
  settings: Pick<
    PlatformSettings,
    "sellerCommissionPercentage" | "fixedTransactionFee"
  >
) {
  const commissionPercentage = Number(settings.sellerCommissionPercentage);
  const fixedTransactionFee = Number(settings.fixedTransactionFee);
  const commissionAmount = price * (commissionPercentage / 100);
  const totalFee = commissionAmount + fixedTransactionFee;

  return {
    commissionPercentage,
    commissionAmount,
    fixedTransactionFee,
    totalFee,
    netAmount: Math.max(price - totalFee, 0)
  };
}
