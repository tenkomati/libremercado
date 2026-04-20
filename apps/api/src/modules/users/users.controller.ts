import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

import { ListUsersQueryDto } from "./dto/list-users-query.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { UsersService } from "./users.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService
  ) {}

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Get()
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Get(":id")
  getUser(@Param("id") id: string, @CurrentUser() user: { sub: string; role: UserRole }) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OPS && user.sub !== id) {
      return this.usersService.getUserById(user.sub);
    }

    return this.usersService.getUserById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.OPS)
  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: { sub: string; role: UserRole }
  ) {
    const updated = await this.usersService.updateStatus(id, dto);

    await this.auditService.logAction({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: "user.status_changed",
      resourceType: "user",
      resourceId: id,
      metadata: { newStatus: dto.status }
    });

    return updated;
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id/role")
  async updateRole(
    @Param("id") id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: { sub: string; role: UserRole }
  ) {
    const updated = await this.usersService.updateRole(id, dto);

    await this.auditService.logAction({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: "user.role_changed",
      resourceType: "user",
      resourceId: id,
      metadata: { newRole: dto.role }
    });

    return updated;
  }
}
