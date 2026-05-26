import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PriceCalculator } from './price-calculator';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    court: { findUnique: jest.Mock };
    order: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    courtMaintenance: { findMany: jest.Mock; findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      court: { findUnique: jest.fn() },
      order: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      courtMaintenance: { findMany: jest.fn(), findFirst: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PriceCalculator,
          useValue: { calculate: jest.fn().mockResolvedValue(150) },
        },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  it('create order with valid data', async () => {
    prisma.court.findUnique.mockResolvedValue({
      id: 'c1',
      status: 'AVAILABLE',
      venueId: 'v1',
      venue: { defaultBusinessHours: null },
    });
    prisma.courtMaintenance.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/require-await
      async (fn: (tx: unknown) => unknown) => {
        const tx = {
          order: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'o1', totalPrice: 150 }),
          },
        };
        return fn(tx);
      },
    );

    const dto = {
      courtId: 'c1',
      startAt: '2026-06-01T10:00:00Z',
      endAt: '2026-06-01T11:30:00Z',
    };
    const order = await service.create('u1', dto);
    expect(order.id).toBe('o1');
  });

  it('rejects non-30min-aligned start time', async () => {
    const dto = {
      courtId: 'c1',
      startAt: '2026-06-01T10:15:00Z',
      endAt: '2026-06-01T11:00:00Z',
    };
    await expect(service.create('u1', dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects when start >= end', async () => {
    const dto = {
      courtId: 'c1',
      startAt: '2026-06-01T11:00:00Z',
      endAt: '2026-06-01T10:00:00Z',
    };
    await expect(service.create('u1', dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects when maintenance conflicts', async () => {
    prisma.court.findUnique.mockResolvedValue({
      id: 'c1',
      status: 'AVAILABLE',
      venueId: 'v1',
      venue: { defaultBusinessHours: null },
    });
    prisma.courtMaintenance.findFirst.mockResolvedValue({ id: 'm1' });

    const dto = {
      courtId: 'c1',
      startAt: '2026-06-01T10:00:00Z',
      endAt: '2026-06-01T11:00:00Z',
    };
    await expect(service.create('u1', dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects when active order exists', async () => {
    prisma.court.findUnique.mockResolvedValue({
      id: 'c1',
      status: 'AVAILABLE',
      venueId: 'v1',
      venue: { defaultBusinessHours: null },
    });
    prisma.courtMaintenance.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/require-await
      async (fn: (tx: unknown) => unknown) => {
        const tx = {
          order: {
            findFirst: jest.fn().mockResolvedValue({ id: 'existing' }),
            create: jest.fn(),
          },
        };
        return fn(tx);
      },
    );

    const dto = {
      courtId: 'c1',
      startAt: '2026-06-01T10:00:00Z',
      endAt: '2026-06-01T11:00:00Z',
    };
    await expect(service.create('u1', dto)).rejects.toThrow(ConflictException);
  });

  it('transition updates status', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      status: 'PENDING_CONFIRM',
    });
    prisma.order.update.mockResolvedValue({ id: 'o1', status: 'CONFIRMED' });

    const result = await service.transition('o1', 'CONFIRMED');
    expect(result.status).toBe('CONFIRMED');
  });

  it('transition rejects invalid state change', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      status: 'COMPLETED',
    });
    await expect(service.transition('o1', 'CANCELLED')).rejects.toThrow(
      'Invalid state transition',
    );
  });
});
