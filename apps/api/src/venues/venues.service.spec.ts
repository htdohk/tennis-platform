import { Test, TestingModule } from '@nestjs/testing';
import { VenuesService } from './venues.service';
import { PrismaService } from '../prisma/prisma.service';

describe('VenuesService', () => {
  let service: VenuesService;
  let prisma: {
    venue: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      venue: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [VenuesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(VenuesService);
  });

  it('findAll returns venues', async () => {
    const mockVenues = [{ id: '1', name: '测试' }];
    prisma.venue.findMany.mockResolvedValue(mockVenues);
    expect(await service.findAll()).toBe(mockVenues);
  });

  it('findOne throws when not found', async () => {
    prisma.venue.findUnique.mockResolvedValue(null);
    await expect(service.findOne('bad-id')).rejects.toThrow('场馆不存在');
  });

  it('create saves venue', async () => {
    const dto = { name: '新馆', address: '地址' };
    prisma.venue.create.mockResolvedValue({ id: '1', ...dto });
    expect(await service.create(dto)).toEqual({ id: '1', ...dto });
  });

  it('update modifies venue', async () => {
    prisma.venue.findUnique.mockResolvedValue({ id: '1', name: '旧' });
    prisma.venue.update.mockResolvedValue({ id: '1', name: '新' });
    expect(await service.update('1', { name: '新' })).toEqual({
      id: '1',
      name: '新',
    });
  });
});
