import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private _client: Redis | null = null;

  constructor() {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this._client = new Redis(url, { lazyConnect: true });
  }

  get client(): Redis {
    if (!this._client) throw new Error('Redis client not initialized');
    return this._client;
  }

  async onModuleInit() {
    if (this._client) await this._client.connect();
  }

  async onModuleDestroy() {
    if (this._client) {
      await this._client.quit();
      this._client = null;
    }
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }
}
