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

  /**
   * Preview matching recruit posts before publishing.
   * Returns top 5 matches sorted by overlap quality.
   */
  async previewMatches(dto: PreviewMatchesDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    const date = dto.date;

    // Find all active recruiting posts on the same date
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

    const matches: {
      post: (typeof posts)[number];
      score: number;
    }[] = [];

    for (const post of posts) {
      // Time overlap check
      if (
        !isSlotsOverlapping(
          startAt,
          endAt,
          post.order.startAt,
          post.order.endAt,
        )
      ) {
        continue;
      }

      // Level range overlap check
      const postLevel = Number(post.targetLevel);
      const postTolerance = Number(post.levelTolerance);
      if (
        !isLevelRangeOverlapping(
          dto.level,
          dto.tolerance,
          postLevel,
          postTolerance,
        )
      ) {
        continue;
      }

      // Score: closer level = higher score
      const levelDiff = Math.abs(dto.level - postLevel);
      const score = 100 - levelDiff * 10;
      matches.push({ post, score });
    }

    // Sort by score desc, take top 5
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, 5).map((m) => ({
      recruitPostId: m.post.id,
      courtId: m.post.order.court.id,
      courtName: m.post.order.court.name,
      nickname: m.post.order.user.nickname,
      level: m.post.order.user.level,
      wechatId: m.post.order.user.wechatId,
      targetLevel: m.post.targetLevel,
      levelTolerance: m.post.levelTolerance,
      startAt: m.post.order.startAt,
      endAt: m.post.order.endAt,
      participantCount: m.post.participants.length,
      maxParticipants: m.post.maxParticipants,
      score: m.score,
    }));
  }

  /**
   * Create a recruit post: creates Order (type=RECRUIT, status=RECRUITING) + RecruitPost.
   */
  async create(userId: string, dto: CreateRecruitDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    // Validate court
    const court = await this.prisma.court.findUnique({
      where: { id: dto.courtId },
      include: { venue: true },
    });
    if (!court || court.status === 'INACTIVE') {
      throw new BadRequestException('场地不可用');
    }

    // Check time conflict
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

    // Calculate price
    const totalPrice = await this.priceCalc.calculate(
      court.venueId,
      startAt,
      endAt,
    );

    // Create Order + RecruitPost in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          courtId: dto.courtId,
          startAt,
          endAt,
          totalPrice,
          type: 'RECRUIT',
          status: 'RECRUITING',
          notes: dto.notes,
        },
      });

      const recruitPost = await tx.recruitPost.create({
        data: {
          orderId: order.id,
          targetLevel: dto.targetLevel,
          levelTolerance: dto.levelTolerance,
          maxParticipants: dto.maxParticipants,
          deadline: new Date(dto.deadline),
        },
        include: { order: true },
      });

      return recruitPost;
    });

    return result;
  }

  /**
   * List recruiting posts (recruit plaza).
   */
  async findAll(date?: string, minLevel?: number, maxLevel?: number) {
    const where: Prisma.RecruitPostWhereInput = {
      status: 'RECRUITING',
      deadline: { gt: new Date() },
    };

    if (date) {
      (where as Record<string, unknown>).order = {
        startAt: { lt: new Date(`${date}T23:59:59Z`) },
        endAt: { gt: new Date(`${date}T00:00:00Z`) },
      };
    }

    if (minLevel !== undefined && maxLevel !== undefined) {
      where.targetLevel = { gte: minLevel, lte: maxLevel };
    }

    const posts = await this.prisma.recruitPost.findMany({
      where,
      include: {
        order: {
          include: {
            user: { select: { nickname: true, level: true, wechatId: true } },
            court: true,
          },
        },
        participants: { select: { id: true, userId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return posts.map((p) => ({
      id: p.id,
      targetLevel: p.targetLevel,
      levelTolerance: p.levelTolerance,
      maxParticipants: p.maxParticipants,
      deadline: p.deadline,
      status: p.status,
      createdAt: p.createdAt,
      user: p.order.user,
      order: { ...p.order, user: undefined },
      participants: p.participants,
    }));
  }

  async findById(id: string) {
    const post = await this.prisma.recruitPost.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: { select: { nickname: true, level: true, wechatId: true } },
            court: { include: { venue: true } },
          },
        },
        participants: {
          include: {
            user: { select: { nickname: true, level: true, wechatId: true } },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('招募局不存在');
    return post;
  }

  /**
   * Join a recruit post. Validates level range and checks capacity.
   */
  async join(recruitPostId: string, userId: string) {
    const post = await this.prisma.recruitPost.findUnique({
      where: { id: recruitPostId },
      include: { participants: true, order: true },
    });
    if (!post) throw new NotFoundException('招募局不存在');
    if (post.status !== 'RECRUITING') {
      throw new BadRequestException('招募局已结束');
    }

    // Check if deadline passed
    if (new Date() > post.deadline) {
      throw new BadRequestException('招募截止时间已过');
    }

    // Get user level
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    // Check level: user's level must be within [targetLevel - tolerance, targetLevel + tolerance]
    const targetLevel = Number(post.targetLevel);
    const tolerance = Number(post.levelTolerance);
    const userLevel = Number(user.level);

    if (
      userLevel < targetLevel - tolerance ||
      userLevel > targetLevel + tolerance
    ) {
      throw new BadRequestException(
        `你的段位 ${String(user.level)} 不符合要求: ${targetLevel} ± ${tolerance}`,
      );
    }

    // Check not already joined
    const alreadyJoined = post.participants.find((p) => p.userId === userId);
    if (alreadyJoined) {
      throw new BadRequestException('你已加入该招募局');
    }

    // Check not full
    if (post.participants.length >= post.maxParticipants) {
      throw new BadRequestException('招募局已满员');
    }

    // Add participant
    const newCount = post.participants.length + 1;
    const isFull = newCount >= post.maxParticipants;

    return this.prisma.$transaction(async (tx) => {
      await tx.recruitParticipant.create({
        data: { recruitPostId, userId },
      });

      // If full, convert to CONFIRMED
      if (isFull) {
        await tx.recruitPost.update({
          where: { id: recruitPostId },
          data: { status: 'CONFIRMED' },
        });
        await tx.order.update({
          where: { id: post.orderId },
          data: { status: 'CONFIRMED' },
        });
      }

      return { joined: true, isFull };
    });
  }

  async leave(recruitPostId: string, userId: string) {
    const post = await this.prisma.recruitPost.findUnique({
      where: { id: recruitPostId },
      include: { participants: true },
    });
    if (!post) throw new NotFoundException('招募局不存在');
    if (post.status !== 'RECRUITING') {
      throw new BadRequestException('招募局已结束,无法退出');
    }

    const participant = post.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new BadRequestException('你未加入该招募局');
    }

    return this.prisma.recruitParticipant.update({
      where: { id: participant.id },
      data: { status: 'LEFT' },
    });
  }

  async convertToNormal(recruitPostId: string, userId: string) {
    const post = await this.prisma.recruitPost.findUnique({
      where: { id: recruitPostId },
      include: { order: true },
    });
    if (!post) throw new NotFoundException('招募局不存在');
    if (post.status !== 'RECRUITING_EXPIRED') {
      throw new BadRequestException('只能在招募失效后转为包场');
    }
    if (post.order.userId !== userId) {
      throw new BadRequestException('只有发起人可以操作');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.recruitPost.update({
        where: { id: recruitPostId },
        data: { status: 'CONFIRMED' },
      });
      return tx.order.update({
        where: { id: post.orderId },
        data: { type: 'NORMAL', status: 'CONFIRMED' },
      });
    });
  }

  async abandon(recruitPostId: string, userId: string) {
    const post = await this.prisma.recruitPost.findUnique({
      where: { id: recruitPostId },
      include: { order: true },
    });
    if (!post) throw new NotFoundException('招募局不存在');
    if (post.status !== 'RECRUITING_EXPIRED') {
      throw new BadRequestException('只能在招募失效后放弃');
    }
    if (post.order.userId !== userId) {
      throw new BadRequestException('只有发起人可以操作');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.recruitPost.update({
        where: { id: recruitPostId },
        data: { status: 'CANCELLED' },
      });
      return tx.order.update({
        where: { id: post.orderId },
        data: { status: 'CANCELLED' },
      });
    });
  }

  async findAllAdmin() {
    return this.prisma.recruitPost.findMany({
      include: {
        order: { include: { user: true, court: true } },
        participants: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelByAdmin(recruitPostId: string) {
    const post = await this.findById(recruitPostId);
    if (post.status === 'CANCELLED' || post.status === 'RECRUITING_EXPIRED') {
      throw new BadRequestException('招募局已结束');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.recruitPost.update({
        where: { id: recruitPostId },
        data: { status: 'CANCELLED' },
      });
      return tx.order.update({
        where: { id: post.orderId },
        data: { status: 'CANCELLED' },
      });
    });
  }

  async cancelByInitiator(recruitId: string, userId: string) {
    const recruit = await this.prisma.recruitPost.findUnique({
      where: { id: recruitId },
      include: { order: true },
    });
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
