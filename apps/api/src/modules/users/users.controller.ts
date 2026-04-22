import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards
} from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { ChangeUserPasswordDto } from "./dto/change-user-password.dto";
import { ListUsersQueryDto } from "./dto/list-users-query.dto";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";
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

  @Patch(":id/profile")
  @RateLimit({ keyPrefix: "user-profile-update", limit: 20, windowSeconds: 3600 })
  async updateProfile(
    @Param("id") id: string,
    @Body() dto: UpdateUserProfileDto,
    @CurrentUser() actor: { sub: string; role: UserRole }
  ) {
    const targetUserId =
      actor.role === UserRole.ADMIN || actor.role === UserRole.OPS ? id : actor.sub;
    const updated = await this.usersService.updateProfile(targetUserId, dto);

    await this.auditService.logAction({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: "user.profile_updated",
      resourceType: "user",
      resourceId: targetUserId,
      metadata: {
        fields: Object.keys(dto)
      }
    });

    return updated;
  }

  @Patch(":id/password")
  @RateLimit({ keyPrefix: "user-password-change", limit: 6, windowSeconds: 3600 })
  async changePassword(
    @Param("id") id: string,
    @Body() dto: ChangeUserPasswordDto,
    @CurrentUser() actor: { sub: string; role: UserRole }
  ) {
    if (id !== actor.sub) {
      throw new BadRequestException("Users can only change their own password");
    }

    const updated = await this.usersService.changePassword(actor.sub, dto);

    await this.auditService.logAction({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: "user.password_changed",
      resourceType: "user",
      resourceId: actor.sub
    });

    return updated;
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
