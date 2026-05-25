import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

type EnvShape = {
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  SESSION_SECRET: string;
  BUSINESS_LLM_BASE_URL: string;
  BUSINESS_LLM_API_KEY: string;
  BUSINESS_LLM_MODEL: string;
  BRAND_NAME: string;
  BRAND_LOGO_URL: string;
  PUBLIC_WEB_BASE_URL: string;
  PUBLIC_ADMIN_BASE_URL: string;
  MCP_SERVER_PORT: string;
  MCP_INTERNAL_TOKEN: string;
  API_PORT: string;
  WEB_CUSTOMER_PORT: string;
  WEB_ADMIN_PORT: string;
  DEFAULT_RECRUIT_LEVEL_TOLERANCE: string;
  SLOT_GRANULARITY_MINUTES: string;
  LOG_LEVEL: string;
  NODE_ENV: string;
};

@Injectable()
export class ConfigService {
  constructor(private readonly config: NestConfigService<EnvShape>) {}

  get<K extends keyof EnvShape>(key: K): EnvShape[K] {
    return this.config.get(key)!;
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  get redisUrl(): string {
    return this.get('REDIS_URL');
  }

  get jwtSecret(): string {
    return this.get('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.get('JWT_EXPIRES_IN');
  }

  get sessionSecret(): string {
    return this.get('SESSION_SECRET');
  }

  get brandName(): string {
    return this.get('BRAND_NAME');
  }

  get nodeEnv(): string {
    return this.get('NODE_ENV');
  }

  get logLevel(): string {
    return this.get('LOG_LEVEL');
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }
}
