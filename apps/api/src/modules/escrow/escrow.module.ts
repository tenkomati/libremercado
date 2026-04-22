import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { EmailModule } from "../email/email.module";
import { ListingsModule } from "../listings/listings.module";
import { UsersModule } from "../users/users.module";

import { EscrowController } from "./escrow.controller";
import { EscrowService } from "./escrow.service";
import { GoogleMapsService } from "./google-maps.service";

@Module({
  imports: [AuditModule, EmailModule, UsersModule, ListingsModule],
  controllers: [EscrowController],
  providers: [EscrowService, GoogleMapsService],
  exports: [EscrowService]
})
export class EscrowModule {}
