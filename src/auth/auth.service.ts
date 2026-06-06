// src/auth/auth.service.ts
import {
  Injectable, ConflictException, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterGuestDto, LoginDto } from './dto/auth.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma:        PrismaService,
    private jwt:           JwtService,
    private config:        ConfigService,
    private emailService?: EmailService,
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

  // ── Anonymous Guest Session ─────────────────────────────────────────────────
  // Creates a temporary anonymous guest row so walk-in users can browse, book,
  // receive notifications and pay — without a registered account.
  // The guest row is marked isAnonymous=true and can be claimed later by
  // calling /auth/guest/claim once the guest registers properly.
  async guestAnonymousSession() {
    const uid  = crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomUUID();
    const hash = await bcrypt.hash(uid, 4); // throwaway password — never used for login
    const guest = await this.prisma.guest.create({
      data: {
        firstName:    'Guest',
        lastName:     uid.slice(0, 6).toUpperCase(),
        email:        `anon_${uid}@hms.local`,
        passwordHash: hash,
        gdprConsent:  false,
        isAnonymous:  true,
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const tokens = await this.signTokens(guest.id, 'GUEST', guest.email);
    return { ...tokens, guest, isAnonymous: true };
  }

  // ── Claim anonymous account ──────────────────────────────────────────────────
  // Upgrades an anonymous guest row to a full account after they fill in the
  // registration form in-app (without losing their existing bookings).
  async claimAnonymousAccount(guestId: string, dto: RegisterGuestDto) {
    const exists = await this.prisma.guest.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (exists && exists.id !== guestId)
      throw new ConflictException('Email already registered to another account');

    const hash  = await bcrypt.hash(dto.password, 12);
    const guest = await this.prisma.guest.update({
      where: { id: guestId },
      data: {
        firstName:    dto.firstName,
        lastName:     dto.lastName,
        email:        dto.email.toLowerCase(),
        passwordHash: hash,
        phone:        dto.phone,
        gdprConsent:  true,
        isAnonymous:  false,
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    const tokens = await this.signTokens(guest.id, 'GUEST', guest.email);
    return { ...tokens, guest };
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

  // ── Forgot Password ─────────────────────────────────────────────────────────
  // Sends a password reset link via email. Always returns success to prevent
  // email enumeration attacks — the response is the same whether or not the
  // email exists in the system.
  async forgotPassword(email: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (guest && !guest.deletedAt && !guest.isAnonymous) {
      const { randomUUID } = require('crypto');
      const token     = randomUUID();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await this.prisma.guest.update({
        where: { id: guest.id },
        data:  { resetToken: token, resetTokenExpiry: expiresAt },
      });

      // Fire-and-forget — don't block the response on email delivery
      this.emailService?.sendPasswordResetEmail?.({
        guestName:  `${guest.firstName} ${guest.lastName}`,
        guestEmail: guest.email,
        resetToken: token,
        hotelName:  'Grand Issyone Hotel',
      }).catch(() => {});
    }

    // Always return the same message regardless of whether email exists
    return { message: 'If this email is registered, a reset link has been sent.' };
  }

  // ── Reset Password ───────────────────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const guest = await this.prisma.guest.findFirst({
      where: {
        resetToken:        token,
        resetTokenExpiry:  { gt: new Date() },
        deletedAt:         null,
      },
    });

    if (!guest) throw new UnauthorizedException('Invalid or expired reset token');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.guest.update({
      where: { id: guest.id },
      data:  {
        passwordHash:      hash,
        resetToken:        null,
        resetTokenExpiry:  null,
      },
    });

    return { message: 'Password reset successfully. You can now log in.' };
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
