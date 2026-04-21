import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import {
  RATE_LIMIT_METADATA_KEY,
  RateLimitOptions
} from "./rate-limit.decorator";
import { RateLimitService } from "./rate-limit.service";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService
  ) {}

  async canActivate(context: ExecutionContext) {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      ip?: string;
      ips?: string[];
      method?: string;
      originalUrl?: string;
      url?: string;
      headers?: Record<string, string | string[] | undefined>;
      user?: { sub?: string };
    }>();
    const identity = request.user?.sub ?? this.getClientIp(request);
    const key = [
      "lm-rate-limit",
      options.keyPrefix,
      identity,
      request.method ?? "UNKNOWN",
      request.originalUrl ?? request.url ?? "unknown"
    ].join(":");
    const result = await this.rateLimitService.hit(
      key,
      options.limit,
      options.windowSeconds
    );

    if (!result.allowed) {
      throw new HttpException(
        `Demasiadas solicitudes. Probá de nuevo en ${result.resetSeconds} segundos.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private getClientIp(request: {
    ip?: string;
    ips?: string[];
    headers?: Record<string, string | string[] | undefined>;
  }) {
    const forwardedFor = request.headers?.["x-forwarded-for"];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(",")[0];

    return forwardedIp?.trim() || request.ips?.[0] || request.ip || "unknown";
  }
}
