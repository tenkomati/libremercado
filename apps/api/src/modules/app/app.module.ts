import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { EscrowModule } from "../escrow/escrow.module";
import { KycModule } from "../kyc/kyc.module";
import { ListingsModule } from "../listings/listings.module";
import { PaymentsModule } from "../payments/payments.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RateLimitModule } from "../rate-limit/rate-limit.module";
import { UsersModule } from "../users/users.module";

import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"]
    }),
    PrismaModule,
    RateLimitModule,
    AuthModule,
    AuditModule,
    UsersModule,
    KycModule,
    ListingsModule,
    PaymentsModule,
    EscrowModule
  ],
  controllers: [AppController]
})
export class AppModule {}
