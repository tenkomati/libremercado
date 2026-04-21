import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { EscrowModule } from "../escrow/escrow.module";

import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [AuditModule, EscrowModule],
  controllers: [PaymentsController],
  providers: [PaymentsService]
})
export class PaymentsModule {}
