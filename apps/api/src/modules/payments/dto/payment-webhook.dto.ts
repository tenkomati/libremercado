import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";

export class PaymentWebhookDto {
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  paymentIntentId?: string;

  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  @IsOptional()
  @IsString()
  providerPreferenceId?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  providerStatus?: string;

  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;
}
