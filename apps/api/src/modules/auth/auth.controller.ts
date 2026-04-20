import { Body, Controller, Get, Ip, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto, @Ip() ipAddress: string) {
    return this.authService.login(dto, { ipAddress });
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser("sub") userId: string) {
    return this.authService.me(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  logout(@CurrentUser() user: { sub: string; role: UserRole }) {
    return this.authService.logout(user);
  }
}
