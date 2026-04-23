import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

import { UpdatePlatformSettingsDto } from "./dto/update-platform-settings.dto";
import { PlatformSettingsService } from "./platform-settings.service";

@Controller()
export class PlatformSettingsController {
  constructor(private readonly platformSettingsService: PlatformSettingsService) {}

  @Get("platform-settings")
  getPublicSettings() {
    return this.platformSettingsService.getSettings();
  }

  @Patch("admin/platform-settings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateSettings(
    @Body() dto: UpdatePlatformSettingsDto,
    @CurrentUser() user: { sub: string; role: UserRole }
  ) {
    return this.platformSettingsService.updateSettings(dto, user);
  }
}
