import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { ListingsModule } from "../listings/listings.module";
import { UsersModule } from "../users/users.module";

import { EscrowController } from "./escrow.controller";
import { EscrowService } from "./escrow.service";

@Module({
  imports: [AuditModule, UsersModule, ListingsModule],
  controllers: [EscrowController],
  providers: [EscrowService]
})
export class EscrowModule {}
