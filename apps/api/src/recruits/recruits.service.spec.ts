import { Test, TestingModule } from '@nestjs/testing';
import { RecruitsService } from './recruits.service';
import { PrismaService } from '../prisma/prisma.service';
import { PriceCalculator } from '../orders/price-calculator';
import { BadRequestException } from '@nestjs/common';

describe('RecruitsService', () => {
  let service: RecruitsService;
  let prisma: {
    court: { findUnique: jest.Mock };
    order: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    recruitPost: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    recruitParticipant: { create: jest.Mock; update: jest.Mock };
    user: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      court: { findUnique: jest.fn() },
      order: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      recruitPost: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      recruitParticipant: { create: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruitsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PriceCalculator,
          useValue: { calculate: jest.fn().mockResolvedValue(200) },
        },
      ],
    }).compile();

    service = module.get(RecruitsService);
  });

  function mockTransaction() {
    prisma.$transaction.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/require-await
      async (fn: (tx: unknown) => unknown) => {
        const tx = {
          recruitParticipant: { create: jest.fn() },
          recruitPost: { update: jest.fn() },
          order: { update: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
        };
        return fn(tx);
      },
    );
  }

  it('join rejects user with wrong level', async () => {
    prisma.recruitPost.findUnique.mockResolvedValue({
      id: 'rp1',
      status: 'RECRUITING',
      deadline: new Date(Date.now() + 3600000),
      orderId: 'o1',
      order: {},
      targetLevel: 3.0,
      levelTolerance: 0.5,
      maxParticipants: 3,
      participants: [],
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'u2', level: 1.5 });

    await expect(service.join('rp1', 'u2')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('join accepts user within level range', async () => {
    prisma.recruitPost.findUnique.mockResolvedValue({
      id: 'rp1',
      status: 'RECRUITING',
      deadline: new Date(Date.now() + 3600000),
      orderId: 'o1',
      order: {},
      targetLevel: 3.0,
      levelTolerance: 0.5,
      maxParticipants: 3,
      participants: [],
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'u2', level: 3.0 });
    mockTransaction();

    const result = await service.join('rp1', 'u2');
    expect(result.joined).toBe(true);
  });

  it('join rejects when already joined', async () => {
    prisma.recruitPost.findUnique.mockResolvedValue({
      id: 'rp1',
      status: 'RECRUITING',
      deadline: new Date(Date.now() + 3600000),
      orderId: 'o1',
      order: {},
      targetLevel: 3.0,
      levelTolerance: 0.5,
      maxParticipants: 3,
      participants: [{ userId: 'u2' }],
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'u2', level: 3.0 });

    await expect(service.join('rp1', 'u2')).rejects.toThrow('你已加入该招募局');
  });
});
