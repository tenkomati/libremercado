import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { KycDocumentType, UserRole } from "@prisma/client";
import { compare, hash } from "bcryptjs";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

type LoginAttempt = {
  count: number;
  firstAttemptAt: number;
};

const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, LoginAttempt>();
  private readonly accessTokenTtlSeconds: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService
  ) {
    this.accessTokenTtlSeconds = Number(
      this.configService.get<string>("JWT_ACCESS_TOKEN_TTL_SECONDS") ??
        60 * 60 * 24 * 7
    );
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new BadRequestException("Email is already registered");
    }

    const existingDni = await this.usersService.findByDni(dto.dni);

    if (existingDni) {
      throw new BadRequestException("DNI is already registered");
    }

    const passwordHash = await hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          dni: dto.dni,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          province: dto.province,
          city: dto.city
        }
      });

      await tx.kycVerification.create({
        data: {
          userId: createdUser.id,
          provider: "frontoffice_signup",
          documentType: KycDocumentType.DNI,
          documentNumber: dto.dni,
          documentFrontImageUrl: dto.documentFrontImageUrl,
          documentBackImageUrl: dto.documentBackImageUrl,
          selfieImageUrl: dto.selfieImageUrl,
          biometricConsentAt: new Date(),
          reviewerNotes:
            "Alta pública con frente de DNI, dorso de DNI y selfie. Requiere revisión operativa o proveedor biométrico antes de aprobar."
        }
      });

      return createdUser;
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto, context?: { ipAddress?: string }) {
    const attemptKey = this.getLoginAttemptKey(dto.email, context?.ipAddress);
    this.ensureLoginAllowed(attemptKey);

    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      this.trackFailedLogin(attemptKey);
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      this.trackFailedLogin(attemptKey);
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.status !== "ACTIVE") {
      this.trackFailedLogin(attemptKey);
      throw new UnauthorizedException("User is not active");
    }

    this.loginAttempts.delete(attemptKey);

    await this.auditService.logAction({
      actorUserId: user.id,
      actorRole: user.role,
      action: "auth.login",
      resourceType: "user",
      resourceId: user.id,
      metadata: {
        ipAddress: context?.ipAddress ?? "unknown"
      }
    });

    return this.buildAuthResponse(user);
  }

  async logout(user: { sub: string; role: UserRole }) {
    await this.auditService.logAction({
      actorUserId: user.sub,
      actorRole: user.role,
      action: "auth.logout",
      resourceType: "user",
      resourceId: user.sub
    });

    return {
      success: true
    };
  }

  async validateUser(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("User session is not valid");
    }

    return user;
  }

  async me(userId: string) {
    const user = await this.validateUser(userId);
    return this.usersService.toSafeUser(user);
  }

  private async buildAuthResponse(user: {
    id: string;
    email: string;
    role: UserRole;
    status: string;
    passwordHash: string;
  }) {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role
      },
      {
        expiresIn: this.accessTokenTtlSeconds
      }
    );

    return {
      accessToken,
      expiresIn: this.accessTokenTtlSeconds,
      user: this.usersService.toSafeUser(user)
    };
  }

  private getLoginAttemptKey(email: string, ipAddress = "unknown") {
    return `${email.trim().toLowerCase()}::${ipAddress}`;
  }

  private ensureLoginAllowed(key: string) {
    const attempt = this.loginAttempts.get(key);

    if (!attempt) {
      return;
    }

    const isExpired = Date.now() - attempt.firstAttemptAt > LOGIN_ATTEMPT_WINDOW_MS;

    if (isExpired) {
      this.loginAttempts.delete(key);
      return;
    }

    if (attempt.count >= LOGIN_MAX_ATTEMPTS) {
      throw new HttpException(
        "Too many login attempts. Try again in a few minutes.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  private trackFailedLogin(key: string) {
    const current = this.loginAttempts.get(key);

    if (!current || Date.now() - current.firstAttemptAt > LOGIN_ATTEMPT_WINDOW_MS) {
      this.loginAttempts.set(key, {
        count: 1,
        firstAttemptAt: Date.now()
      });
      return;
    }

    this.loginAttempts.set(key, {
      ...current,
      count: current.count + 1
    });
  }
}
