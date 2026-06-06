// src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterGuestDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './auth.guards';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('guest/register')
  registerGuest(@Body() dto: RegisterGuestDto) {
    return this.auth.registerGuest(dto);
  }

  @Post('guest/login')
  @HttpCode(200)
  loginGuest(@Body() dto: LoginDto) {
    return this.auth.loginGuest(dto);
  }

  @Post('staff/login')
  @HttpCode(200)
  loginStaff(@Body() dto: LoginDto) {
    return this.auth.loginStaff(dto);
  }

  @Post('guest/anonymous')
  @HttpCode(200)
  guestAnonymousSession() {
    return this.auth.guestAnonymousSession();
  }

  @Post('guest/claim')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  claimAnonymousAccount(@Request() req: any, @Body() dto: RegisterGuestDto) {
    return this.auth.claimAnonymousAccount(req.user.id, dto);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body('refreshToken') token: string) {
    return this.auth.refresh(token);
  }

  // ── Forgot Password — public, no auth needed ───────────────────────────────
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body('email') email: string) {
    return this.auth.forgotPassword(email);
  }

  // ── Reset Password — token from email link ─────────────────────────────────
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.auth.resetPassword(token, password);
  }
}