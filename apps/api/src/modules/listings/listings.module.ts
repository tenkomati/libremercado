import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { PlatformSettingsModule } from "../platform-settings/platform-settings.module";
import { UsersModule } from "../users/users.module";

import { ListingsController } from "./listings.controller";
import { ListingsService } from "./listings.service";

@Module({
  imports: [AuditModule, UsersModule, PlatformSettingsModule],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService]
})
export class ListingsModule {}
