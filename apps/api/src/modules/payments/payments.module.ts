import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { EmailModule } from "../email/email.module";
import { EscrowModule } from "../escrow/escrow.module";
import { InsuranceModule } from "../insurance/insurance.module";

import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [AuditModule, EmailModule, EscrowModule, InsuranceModule],
  controllers: [PaymentsController],
  providers: [PaymentsService]
})
export class PaymentsModule {}
