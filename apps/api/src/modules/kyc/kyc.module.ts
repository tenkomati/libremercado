import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";

import { KycController } from "./kyc.controller";
import { KycService } from "./kyc.service";

@Module({
  imports: [AuditModule, UsersModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService]
})
export class KycModule {}

