import * as Joi from "joi";

export const configValidationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string().valid("development", "production", "test").required(),
  API_PORT: Joi.number().default(3001),
  CORS_ORIGIN: Joi.string().uri().required(),
  COOKIE_SECRET: Joi.string().min(32).required(),

  // Database
  DATABASE_URL: Joi.string().uri().required(),

  // Redis
  REDIS_URL: Joi.string().uri().required(),

  // JWT
  JWT_SECRET: Joi.string().min(64).required(),
  JWT_EXPIRES_IN: Joi.string().default("15m"),
  REFRESH_TOKEN_SECRET: Joi.string().min(64).required(),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default("30d"),
  COOKIE_DOMAIN: Joi.string().required(),

  // Rate limiting
  THROTTLE_TTL_MS: Joi.number().default(60_000),
  THROTTLE_LIMIT: Joi.number().default(60),

  // Firebase
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),

  // Twilio (optional fallback)
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_FROM_NUMBER: Joi.string().optional(),

  // Platform
  PLATFORM_FEE_PERCENT: Joi.number().default(2.0),
  GEO_FENCE_RADIUS_KM: Joi.number().default(50),
}).options({ allowUnknown: true }); // allow extra vars (Razorpay, storage, etc.)
