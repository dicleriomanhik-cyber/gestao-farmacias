import * as Joi from 'joi';

const DURATION = /^\d+[smhd]$/;

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().positive().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().pattern(DURATION).default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().pattern(DURATION).default('7d'),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  CORS_ORIGINS: Joi.string().default(''),
  LOGIN_MAX_ATTEMPTS: Joi.number().integer().min(1).default(10),
  LOGIN_WINDOW_MINUTES: Joi.number().integer().min(1).default(15),
});
