import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InternalAuthGuard } from './internal-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInternalRecruitDto,
  QueryRecruitsDto,
} from './dto/internal-recruit.dto';

@Controller('internal/recruits')
@UseGuards(InternalAuthGuard)
export class InternalRecruitsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async queryRecruitPosts(@Query() query: QueryRecruitsDto) {
    const where: Record<string, unknown> = {
      status: 'RECRUITING',
      deadline: { gt: new Date() },
    };

    if (query.date) {
      where.order = {
        startAt: { lt: new Date(`${query.date}T23:59:59Z`) },
        endAt: { gt: new Date(`${query.date}T00:00:00Z`) },
      };
    }

    const posts = await this.prisma.recruitPost.findMany({
      where: where,
      include: {
        order: {
          include: {
            user: {
              select: { id: true, nickname: true, level: true, wechatId: true },
            },
            court: { include: { venue: { select: { name: true } } } },
          },
        },
        participants: { select: { id: true, userId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let filtered = posts;
    if (query.minLevel !== undefined && query.maxLevel !== undefined) {
      filtered = posts.filter((p) => {
        const pMin =
          p.minLevel != null
            ? Number(p.minLevel)
            : Number(p.targetLevel) - Number(p.levelTolerance);
        const pMax =
          p.maxLevel != null
            ? Number(p.maxLevel)
            : Number(p.targetLevel) + Number(p.levelTolerance);
        return pMin <= query.maxLevel! && pMax >= query.minLevel!;
      });
    }

    return filtered.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      initiator: {
        id: p.order.user.id,
        nickname: p.order.user.nickname,
        level: p.order.user.level,
        wechatId: p.order.user.wechatId,
      },
      courtId: p.order.courtId,
      courtName: p.order.court.name,
      venueName: p.order.court.venue.name,
      startAt: p.order.startAt,
      endAt: p.order.endAt,
      minLevel:
        p.minLevel != null
          ? Number(p.minLevel)
          : Number(p.targetLevel) - Number(p.levelTolerance),
      maxLevel:
        p.maxLevel != null
          ? Number(p.maxLevel)
          : Number(p.targetLevel) + Number(p.levelTolerance),
      maxParticipants: p.maxParticipants,
      currentParticipants: p.participants.length,
      deadline: p.deadline,
      status: p.status,
      createdAt: p.createdAt,
    }));
  }

  @Post()
  async createRecruitPost(@Body() dto: CreateInternalRecruitDto) {
    const user = await this.prisma.user.findFirst({
      where: { wechatId: dto.wechatId },
    });
    if (!user) {
      throw new NotFoundException(
        `未找到微信号为 ${dto.wechatId} 的用户，请先注册`,
      );
    }
    if (user.status === 'BANNED') {
      throw new BadRequestException('该用户已被封禁');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (
      startAt.getUTCMinutes() % 30 !== 0 ||
      endAt.getUTCMinutes() % 30 !== 0
    ) {
      throw new BadRequestException('时段必须是 30 分钟的整数倍');
    }
    if (startAt >= endAt) {
      throw new BadRequestException('开始时间必须早于结束时间');
    }
    if (dto.minLevel > dto.maxLevel) {
      throw new BadRequestException('最低段位不能高于最高段位');
    }

    const court = await this.prisma.court.findUnique({
      where: { id: dto.courtId },
      include: { venue: true },
    });
    if (!court || court.status === 'INACTIVE') {
      throw new BadRequestException('场地不可用');
    }

    const conflict = await this.prisma.order.findFirst({
      where: {
        courtId: dto.courtId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        status: { in: ['PENDING_CONFIRM', 'CONFIRMED', 'RECRUITING'] },
      },
    });
    if (conflict) {
      throw new BadRequestException('所选时段已被占用');
    }

    const targetLevel = (dto.minLevel + dto.maxLevel) / 2;
    const levelTolerance = (dto.maxLevel - dto.minLevel) / 2;

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: user.id,
          courtId: dto.courtId,
          startAt,
          endAt,
          type: 'RECRUIT',
          status: 'RECRUITING',
          notes: dto.notes,
        },
      });
      const recruitPost = await tx.recruitPost.create({
        data: {
          orderId: order.id,
          minLevel: dto.minLevel,
          maxLevel: dto.maxLevel,
          targetLevel,
          levelTolerance,
          maxParticipants: dto.maxParticipants,
          deadline: new Date(dto.deadline),
        },
      });
      return recruitPost;
    });

    return { recruitId: result.id };
  }
}
