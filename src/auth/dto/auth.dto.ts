// src/auth/dto/register-guest.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterGuestDto {
  @IsString() @MaxLength(100) firstName: string;
  @IsString() @MaxLength(100) lastName: string;
  @IsEmail()                  email: string;
  @IsString() @MinLength(8)   password: string;
  @IsOptional() @IsString()   phone?: string;
}

// src/auth/dto/login.dto.ts
export class LoginDto {
  @IsEmail()                email: string;
  @IsString() @MinLength(1) password: string;
}
