import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PreviewMatchesDto, CreateRecruitDto } from './dto/recruit.dto';
import { isSlotsOverlapping, isLevelRangeOverlapping } from './recruit-matcher';
import { PriceCalculator } from '../orders/price-calculator';
import { Prisma } from '@prisma/client';

@Injectable()
export class RecruitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly priceCalc: PriceCalculator,
  ) {}

  async previewMatches(dto: PreviewMatchesDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    const date = dto.date;

    const posts = await this.prisma.recruitPost.findMany({
      where: {
        status: 'RECRUITING',
        deadline: { gt: new Date() },
        order: {
          startAt: { lt: new Date(`${date}T23:59:59Z`) },
          endAt: { gt: new Date(`${date}T00:00:00Z`) },
          court: { status: { not: 'INACTIVE' } },
        },
      },
      include: {
        order: {
          include: {
            user: { select: { nickname: true, level: true, wechatId: true } },
            court: { select: { id: true, name: true } },
          },
        },
        participants: { select: { id: true } },
      },
    });

    const matches: { post: (typeof posts)[number]; score: number }[] = [];

    for (const post of posts) {
      if (!isSlotsOverlapping(startAt, endAt, post.order.startAt, post.order.endAt)) continue;

      const postMin = post.minLevel != null ? Number(post.minLevel) : Number(post.targetLevel) - Number(post.levelTolerance);
      const postMax = post.maxLevel != null ? Number(post.maxLevel) : Number(post.targetLevel) + Number(post.levelTolerance);

      if (!isLevelRangeOverlapping(dto.minLevel, dto.maxLevel, postMin, postMax)) continue;

      const mid = (dto.minLevel + dto.maxLevel) / 2;
      const levelDiff = Math.abs(mid - (postMin + postMax) / 2);
      const score = 100 - levelDiff * 10;
      matches.push({ post, score });
    }

    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, 5).map((m) => ({
      recruitPostId: m.post.id,
      courtId: m.post.order.court.id,
      courtName: m.post.order.court.name,
      nickname: m.post.order.user.nickname,
      level: m.post.order.user.level,
      wechatId: m.post.order.user.wechatId,
      minLevel: m.post.minLevel ?? Number(m.post.targetLevel) - Number(m.post.levelTolerance),
      maxLevel: m.post.maxLevel ?? Number(m.post.targetLevel) + Number(m.post.levelTolerance),
      targetLevel: m.post.targetLevel,
      levelTolerance: m.post.levelTolerance,
      startAt: m.post.order.startAt,
      endAt: m.post.order.endAt,
      participantCount: m.post.participants.length,
      maxParticipants: m.post.maxParticipants,
      score: m.score,
    }));
  }

  async create(userId: string, dto: CreateRecruitDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    const court = await this.prisma.court.findUnique({
      where: { id: dto.courtId },
      include: { venue: true },
    });
    if (!court || court.status === 'INACTIVE') throw new BadRequestException('场地不可用');

    const conflict = await this.prisma.order.findFirst({
      where: {
        courtId: dto.courtId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        status: { in: ['PENDING_CONFIRM', 'CONFIRMED', 'RECRUITING'] },
      },
    });
    if (conflict) throw new BadRequestException('所选时段已被占用');

    const totalPrice = await this.priceCalc.calculate(court.venueId, startAt, endAt);

    const targetLevel = (dto.minLevel + dto.maxLevel) / 2;
    const levelTolerance = (dto.maxLevel - dto.minLevel) / 2;

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: { userId, courtId: dto.courtId, startAt, endAt, totalPrice, type: 'RECRUIT', status: 'RECRUITING', notes: dto.notes },
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
        include: { order: true },
      });
      return recruitPost;
    });
    return result;
  }

  async findAll(date?: string, minLevel?: number, maxLevel?: number) {
    const where: Prisma.RecruitPostWhereInput = { status: 'RECRUITING', deadline: { gt: new Date() } };

    if (date) {
      (where as Record<string, unknown>).order = {
        startAt: { lt: new Date(`${date}T23:59:59Z`) },
        endAt: { gt: new Date(`${date}T00:00:00Z`) },
      };
    }

    if (minLevel !== undefined && maxLevel !== undefined) {
      // Filter in application code: check if level range overlaps
    }

    const posts = await this.prisma.recruitPost.findMany({
      where,
      include: {
        order: { include: { user: { select: { nickname: true, level: true, wechatId: true } }, court: true } },
        participants: { select: { id: true, userId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let filtered = posts;
    if (minLevel !== undefined && maxLevel !== undefined) {
      filtered = posts.filter((p) => {
        const pMin = p.minLevel != null ? Number(p.minLevel) : Number(p.targetLevel) - Number(p.levelTolerance);
        const pMax = p.maxLevel != null ? Number(p.maxLevel) : Number(p.targetLevel) + Number(p.levelTolerance);
        return pMin <= maxLevel && pMax >= minLevel;
      });
    }

    return filtered.map((p) => {
      const minLvl = p.minLevel != null ? Number(p.minLevel) : Number(p.targetLevel) - Number(p.levelTolerance);
      const maxLvl = p.maxLevel != null ? Number(p.maxLevel) : Number(p.targetLevel) + Number(p.levelTolerance);
      return {
        id: p.id,
        targetLevel: p.targetLevel,
        levelTolerance: p.levelTolerance,
        minLevel: minLvl,
        maxLevel: maxLvl,
        maxParticipants: p.maxParticipants,
        deadline: p.deadline,
        status: p.status,
        createdAt: p.createdAt,
        user: p.order.user,
        order: { ...p.order, user: undefined },
        participants: p.participants,
      };
    });
  }

  async findById(id: string) {
    const post = await this.prisma.recruitPost.findUnique({
      where: { id },
      include: {
        order: { include: { user: { select: { nickname: true, level: true, wechatId: true } }, court: { include: { venue: true } } } },
        participants: { include: { user: { select: { nickname: true, level: true, wechatId: true } } } },
      },
    });
    if (!post) throw new NotFoundException('招募局不存在');
    return post;
  }

  async join(recruitPostId: string, userId: string) {
    const post = await this.prisma.recruitPost.findUnique({
      where: { id: recruitPostId },
      include: { participants: true, order: true },
    });
    if (!post) throw new NotFoundException('招募局不存在');
    if (post.status !== 'RECRUITING') throw new BadRequestException('招募局已结束');
    if (new Date() > post.deadline) throw new BadRequestException('招募截止时间已过');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const userLevel = Number(user.level);
    const recMin = post.minLevel != null ? Number(post.minLevel) : Number(post.targetLevel) - Number(post.levelTolerance);
    const recMax = post.maxLevel != null ? Number(post.maxLevel) : Number(post.targetLevel) + Number(post.levelTolerance);

    if (userLevel < recMin || userLevel > recMax) {
      throw new BadRequestException(`你的段位 ${String(user.level)} 不符合要求：${recMin.toFixed(1)} ~ ${recMax.toFixed(1)}`);
    }

    const alreadyJoined = post.participants.find((p) => p.userId === userId);
    if (alreadyJoined) throw new BadRequestException('你已加入该招募局');

    if (post.participants.length >= post.maxParticipants) throw new BadRequestException('招募局已满员');

    const newCount = post.participants.length + 1;
    const isFull = newCount >= post.maxParticipants;

    return this.prisma.$transaction(async (tx) => {
      await tx.recruitParticipant.create({ data: { recruitPostId, userId } });
      if (isFull) {
        await tx.recruitPost.update({ where: { id: recruitPostId }, data: { status: 'CONFIRMED' } });
        await tx.order.update({ where: { id: post.orderId }, data: { status: 'CONFIRMED' } });
      }
      return { joined: true, isFull };
    });
  }

  async leave(recruitPostId: string, userId: string) {
    const post = await this.prisma.recruitPost.findUnique({
      where: { id: recruitPostId }, include: { participants: true },
    });
    if (!post) throw new NotFoundException('招募局不存在');
    if (post.status !== 'RECRUITING') throw new BadRequestException('招募局已结束,无法退出');
    const p = post.participants.find((p) => p.userId === userId);
    if (!p) throw new BadRequestException('你未加入该招募局');
    return this.prisma.recruitParticipant.update({ where: { id: p.id }, data: { status: 'LEFT' } });
  }

  async convertToNormal(recruitPostId: string, userId: string) {
    const post = await this.prisma.recruitPost.findUnique({ where: { id: recruitPostId }, include: { order: true } });
    if (!post) throw new NotFoundException('招募局不存在');
    if (post.status !== 'RECRUITING_EXPIRED') throw new BadRequestException('只能在招募失效后转为包场');
    if (post.order.userId !== userId) throw new BadRequestException('只有发起人可以操作');
    return this.prisma.$transaction(async (tx) => {
      await tx.recruitPost.update({ where: { id: recruitPostId }, data: { status: 'CONFIRMED' } });
      return tx.order.update({ where: { id: post.orderId }, data: { type: 'NORMAL', status: 'CONFIRMED' } });
    });
  }

  async abandon(recruitPostId: string, userId: string) {
    const post = await this.prisma.recruitPost.findUnique({ where: { id: recruitPostId }, include: { order: true } });
    if (!post) throw new NotFoundException('招募局不存在');
    if (post.status !== 'RECRUITING_EXPIRED') throw new BadRequestException('只能在招募失效后放弃');
    if (post.order.userId !== userId) throw new BadRequestException('只有发起人可以操作');
    return this.prisma.$transaction(async (tx) => {
      await tx.recruitPost.update({ where: { id: recruitPostId }, data: { status: 'CANCELLED' } });
      return tx.order.update({ where: { id: post.orderId }, data: { status: 'CANCELLED' } });
    });
  }

  async findAllAdmin() {
    return this.prisma.recruitPost.findMany({
      include: { order: { include: { user: true, court: true } }, participants: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelByAdmin(recruitPostId: string) {
    const post = await this.findById(recruitPostId);
    if (post.status === 'CANCELLED' || post.status === 'RECRUITING_EXPIRED') throw new BadRequestException('招募局已结束');
    return this.prisma.$transaction(async (tx) => {
      await tx.recruitPost.update({ where: { id: recruitPostId }, data: { status: 'CANCELLED' } });
      return tx.order.update({ where: { id: post.orderId }, data: { status: 'CANCELLED' } });
    });
  }

  async cancelByInitiator(recruitId: string, userId: string) {
    const recruit = await this.prisma.recruitPost.findUnique({ where: { id: recruitId }, include: { order: true } });
    if (!recruit) throw new NotFoundException('招募不存在');
    if (recruit.order.userId !== userId) throw new ForbiddenException('只有发起人可以取消');
    if (recruit.status !== 'RECRUITING') throw new BadRequestException('只有招募中的招募可以取消');
    return this.prisma.$transaction(async (tx) => {
      await tx.recruitPost.update({ where: { id: recruitId }, data: { status: 'CANCELLED' } });
      await tx.order.update({ where: { id: recruit.orderId }, data: { status: 'CANCELLED' } });
      await tx.auditLog.create({ data: { action: 'RECRUIT_CANCELLED_BY_INITIATOR', target: `recruit_post:${recruitId}`, payload: { userId } } });
      return { success: true };
    });
  }
}
