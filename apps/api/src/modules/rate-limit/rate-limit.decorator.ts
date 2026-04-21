import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_METADATA_KEY = "libremercado:rate-limit";

export type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
};

export function RateLimit(options: RateLimitOptions) {
  return SetMetadata(RATE_LIMIT_METADATA_KEY, options);
}
