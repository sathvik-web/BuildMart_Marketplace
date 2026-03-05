// ============================================================
// BuildMart API — Bootstrap
// Fastify adapter · Cookie-based JWT · Global guards
// ============================================================

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe, VersioningType, Logger } from "@nestjs/common";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const config = app.get(ConfigService);
  const port = config.get<number>("API_PORT", 3001);
  const origin = config.get<string>("CORS_ORIGIN", "http://localhost:3000");
  const nodeEnv = config.get<string>("NODE_ENV", "development");

  // ── Security headers ──────────────────────────────────────
  await app.register(fastifyHelmet as any, {
    contentSecurityPolicy: nodeEnv === "production",
  });

  // ── Cookie parser (for HTTP-only JWT cookies) ─────────────
  await app.register(fastifyCookie as any, {
    secret: config.getOrThrow<string>("COOKIE_SECRET"),
  });

  // ── CORS ─────────────────────────────────────────────────
  app.enableCors({
    origin,
    credentials: true,                        // allow cookies cross-origin
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  });

  // ── API versioning — /api/v1/... ─────────────────────────
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  // ── Global validation pipe ────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,           // auto-transform DTOs
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global exception filter ───────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Global response envelope ─────────────────────────────
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(port, "0.0.0.0");
  logger.log(`🚀 BuildMart API running on http://0.0.0.0:${port}/api/v1`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
}

bootstrap();
