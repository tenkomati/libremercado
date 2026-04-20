import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

import { AuditService } from "./audit.service";
import { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("admin")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Get("overview")
  getOverview() {
    return this.auditService.getOverview();
  }

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Get("audit-logs")
  listRecent(@Query() query: ListAuditLogsQueryDto) {
    return this.auditService.listRecent(query);
  }
}
