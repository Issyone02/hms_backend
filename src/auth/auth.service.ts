// src/auth/auth.service.ts
import {
  Injectable, ConflictException, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterGuestDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma:  PrismaService,
    private jwt:     JwtService,
    private config:  ConfigService,
  ) {}

  // ── Guest Register ──────────────────────────────────────────────────────────
  async registerGuest(dto: RegisterGuestDto) {
    const exists = await this.prisma.guest.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (exists) throw new ConflictException('Email already registered');

    const hash  = await bcrypt.hash(dto.password, 12);
    const guest = await this.prisma.guest.create({
      data: {
        firstName:    dto.firstName,
        lastName:     dto.lastName,
        email:        dto.email.toLowerCase(),
        passwordHash: hash,
        phone:        dto.phone,
        gdprConsent:  true,
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    const tokens = await this.signTokens(guest.id, 'GUEST', guest.email);
    return { ...tokens, guest };
  }

  // ── Guest Login ─────────────────────────────────────────────────────────────
  async loginGuest(dto: LoginDto) {
    const guest = await this.prisma.guest.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!guest || guest.deletedAt)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, guest.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.signTokens(guest.id, 'GUEST', guest.email);
    return {
      ...tokens,
      guest: { id: guest.id, firstName: guest.firstName, lastName: guest.lastName, email: guest.email },
    };
  }

  // ── Staff Login ─────────────────────────────────────────────────────────────
  async loginStaff(dto: LoginDto) {
    const staff = await this.prisma.staff.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!staff || !staff.isActive)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.signTokens(staff.id, staff.role, staff.email);
    return {
      ...tokens,
      staff: { id: staff.id, name: staff.name, role: staff.role, email: staff.email },
    };
  }

  // ── Token helper ────────────────────────────────────────────────────────────
  private async signTokens(sub: string, role: string, email: string) {
    const payload = { sub, role, email };
    const [token, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret:    this.config.get('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwt.signAsync(payload, {
        secret:    this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);
    return { token, refreshToken };
  }

  // ── Refresh ─────────────────────────────────────────────────────────────────
  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const token = await this.jwt.signAsync(
        { sub: payload.sub, role: payload.role, email: payload.email },
        { secret: this.config.get('JWT_SECRET'), expiresIn: '15m' },
      );
      return { token };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
