import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let redis: {
    client: {
      incr: jest.Mock;
      expire: jest.Mock;
      del: jest.Mock;
      get: jest.Mock;
      ttl: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    redis = {
      client: {
        incr: jest.fn(),
        expire: jest.fn(),
        del: jest.fn(),
        get: jest.fn(),
        ttl: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('register creates user with hashed password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const dto = {
      phone: '13800001111',
      password: 'test123',
      nickname: '测试',
      level: 3.0,
      wechatId: 'wx_test',
    };
    prisma.user.create.mockResolvedValue({
      id: '1',
      ...dto,
      passwordHash: 'hashed',
    });
    const user = await service.register(dto);
    expect(user.phone).toBe(dto.phone);
  });

  it('register throws on duplicate phone', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'exist' });
    const dto = {
      phone: '13800001111',
      password: 'test123',
      nickname: '测试',
      level: 3.0,
      wechatId: 'wx',
    };
    await expect(service.register(dto)).rejects.toThrow(ConflictException);
  });

  it('recordLoginFailure increments redis', async () => {
    redis.client.incr.mockResolvedValue(1);
    redis.client.expire.mockResolvedValue(1);
    const result = await service.recordLoginFailure('138');
    expect(result.attempts).toBe(1);
    expect(result.locked).toBe(false);
    expect(redis.client.expire).toHaveBeenCalledWith('login_attempts:138', 300);
  });

  it('recordLoginFailure returns locked when >= 5', async () => {
    redis.client.incr.mockResolvedValue(5);
    const result = await service.recordLoginFailure('138');
    expect(result.locked).toBe(true);
  });

  it('resetLoginAttempts deletes key', async () => {
    redis.client.del.mockResolvedValue(1);
    await service.resetLoginAttempts('138');
    expect(redis.client.del).toHaveBeenCalledWith('login_attempts:138');
  });
});
