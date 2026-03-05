import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { FastifyRequest } from "fastify";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: FastifyRequest) => {
          const cookies = req?.cookies as Record<string, string> | undefined;
          return cookies?.["refresh_token"] ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("REFRESH_TOKEN_SECRET"),
      issuer: "buildmart.in",
      audience: "buildmart-api",
    });
  }

  // Just pass through — actual rotation happens in AuthService.refreshTokens
  async validate(payload: any) {
    return payload;
  }
}
