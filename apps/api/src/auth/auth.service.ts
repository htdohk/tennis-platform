import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  login(user: { id: string; phone: string; role: string }) {
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    return { accessToken: this.jwtService.sign(payload) };
  }

  async validateJwtPayload(payload: {
    sub: string;
    phone: string;
    role: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.status !== 'ACTIVE') return null;
    return { id: user.id, phone: user.phone, role: user.role };
  }
}
