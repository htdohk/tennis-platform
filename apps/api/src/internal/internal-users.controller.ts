import {
  Controller,
  Get,
  Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { InternalAuthGuard } from './internal-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('internal/users')
@UseGuards(InternalAuthGuard)
export class InternalUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('by-wechat')
  async queryUserByWechat(@Query('wechatId') wechatId: string) {
    const user = await this.prisma.user.findFirst({
      where: { wechatId },
      select: {
        id: true,
        nickname: true,
        level: true,
        phone: true,
        wechatId: true,
        gender: true,
        status: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`未找到微信号为 ${wechatId} 的用户`);
    }
    return user;
  }
}
