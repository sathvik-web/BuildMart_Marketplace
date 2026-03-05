import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { FastifyRequest } from "fastify";
import { TokenService } from "../token.service";
import { UserRole, UserStatus } from "@buildmart/database";

export interface JwtPayload {
  sub: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  sessionId: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly tokenService: TokenService,
  ) {
    super({
      // Extract JWT from the HTTP-only access_token cookie
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: FastifyRequest) => {
          const cookies = req?.cookies as Record<string, string> | undefined;
          return cookies?.["access_token"] ?? null;
        },
        // Fallback: Authorization: Bearer <token> (for API clients / testing)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
      issuer: "buildmart.in",
      audience: "buildmart-api",
    });
  }

  async validate(payload: JwtPayload) {
    return this.tokenService.validatePayload(payload);
  }
}
