import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { EmailModule } from "../email/email.module";
import { ListingsModule } from "../listings/listings.module";
import { UsersModule } from "../users/users.module";

import { InsuranceController } from "./insurance.controller";
import { InsuranceService } from "./insurance.service";

@Module({
  imports: [AuditModule, EmailModule, ListingsModule, UsersModule],
  controllers: [InsuranceController],
  providers: [InsuranceService],
  exports: [InsuranceService]
})
export class InsuranceModule {}
