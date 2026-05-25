import { Test, TestingModule } from '@nestjs/testing';
import { CourtsService } from './courts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CourtsService', () => {
  let service: CourtsService;
  let prisma: {
    court: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    courtMaintenance: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      court: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      courtMaintenance: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CourtsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CourtsService);
  });

  it('findAll returns courts', async () => {
    prisma.court.findMany.mockResolvedValue([{ id: '1' }]);
    expect(await service.findAll()).toEqual([{ id: '1' }]);
  });

  it('create saves court', async () => {
    const dto = {
      venueId: 'v1',
      code: 'A3',
      name: '新场',
      type: 'INDOOR' as const,
      surface: 'HARD' as const,
    };
    prisma.court.create.mockResolvedValue({ id: '1', ...dto });
    expect(await service.create(dto)).toEqual({ id: '1', ...dto });
  });

  it('addMaintenance creates record', async () => {
    prisma.court.findUnique.mockResolvedValue({ id: 'c1' });
    const dto = {
      startAt: '2026-06-01T10:00:00Z',
      endAt: '2026-06-01T12:00:00Z',
    };
    prisma.courtMaintenance.create.mockResolvedValue({
      id: 'm1',
      courtId: 'c1',
      ...dto,
    });
    expect(await service.addMaintenance('c1', dto)).toEqual({
      id: 'm1',
      courtId: 'c1',
      ...dto,
    });
  });
});
