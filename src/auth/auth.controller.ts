// src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterGuestDto, LoginDto } from './dto/auth.dto';

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

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body('refreshToken') token: string) {
    return this.auth.refresh(token);
  }
}