import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) throw new ConflictException('该手机号已注册');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        phone: dto.phone,
        passwordHash,
        nickname: dto.nickname,
        level: dto.level,
        wechatId: dto.wechatId,
        gender: dto.gender,
      },
    });
  }

  async recordLoginFailure(phone: string) {
    const key = `login_attempts:${phone}`;
    const attempts = await this.redis.client.incr(key);
    if (attempts === 1) await this.redis.client.expire(key, 300);
    return { attempts, locked: attempts >= 5 };
  }

  async resetLoginAttempts(phone: string) {
    await this.redis.client.del(`login_attempts:${phone}`);
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async updateMe(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  findMe(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        nickname: true,
        level: true,
        wechatId: true,
        gender: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        nickname: true,
        level: true,
        wechatId: true,
        gender: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateByAdmin(id: string, dto: UpdateUserDto) {
    await this.findById(id);
    return this.prisma.user.update({ where: { id }, data: dto });
  }
}
