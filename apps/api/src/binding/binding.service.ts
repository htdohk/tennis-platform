import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BindingService {
  constructor(private readonly prisma: PrismaService) {}

  async generateBindCode(userId: string): Promise<{ code: string; expiresAt: Date }> {
    await this.prisma.bindCode.updateMany({
      where: { userId, used: false },
      data: { used: true },
    });

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.bindCode.create({
      data: { userId, code, expiresAt },
    });

    return { code, expiresAt };
  }

  async verifyAndBind(
    code: string,
    hermesId: string,
    groupId?: string,
  ): Promise<{ success: boolean; userId?: string; nickname?: string; message: string }> {
    const bindCode = await this.prisma.bindCode.findUnique({
      where: { code },
      include: { user: true },
    });

    if (!bindCode) return { success: false, message: '绑定码不存在' };
    if (bindCode.used) return { success: false, message: '绑定码已使用' };
    if (bindCode.expiresAt < new Date()) return { success: false, message: '绑定码已过期，请重新生成' };

    const effectiveGroupId = groupId ?? '';

    await this.prisma.$transaction([
      this.prisma.hermesBinding.upsert({
        where: { hermesId_groupId: { hermesId, groupId: effectiveGroupId } },
        create: { userId: bindCode.userId, hermesId, groupId },
        update: { userId: bindCode.userId },
      }),
      this.prisma.bindCode.update({
        where: { id: bindCode.id },
        data: { used: true },
      }),
    ]);

    return {
      success: true,
      userId: bindCode.userId,
      nickname: bindCode.user.nickname,
      message: `绑定成功！欢迎 ${bindCode.user.nickname}`,
    };
  }

  async getUserByHermesId(
    hermesId: string,
    groupId?: string,
  ): Promise<{ userId: string; nickname: string; level: string; wechatId: string } | null> {
    const effectiveGroupId = groupId ?? '';
    const binding = await this.prisma.hermesBinding.findUnique({
      where: { hermesId_groupId: { hermesId, groupId: effectiveGroupId } },
      include: { user: true },
    });
    if (!binding) return null;
    return {
      userId: binding.user.id,
      nickname: binding.user.nickname,
      level: binding.user.level.toString(),
      wechatId: binding.user.wechatId,
    };
  }

  async manualBind(userId: string, hermesId: string, groupId?: string): Promise<void> {
    const effectiveGroupId = groupId ?? '';
    await this.prisma.hermesBinding.upsert({
      where: { hermesId_groupId: { hermesId, groupId: effectiveGroupId } },
      create: { userId, hermesId, groupId },
      update: { userId },
    });
  }
}
