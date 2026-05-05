import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterGuestDto, LoginDto } from './dto/auth.dto';
export declare class AuthService {
    private prisma;
    private jwt;
    private config;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
    registerGuest(dto: RegisterGuestDto): Promise<{
        guest: {
            firstName: string;
            lastName: string;
            email: string;
            phone: string | null;
            id: string;
        };
        token: string;
        refreshToken: string;
    }>;
    loginGuest(dto: LoginDto): Promise<{
        guest: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
        };
        token: string;
        refreshToken: string;
    }>;
    loginStaff(dto: LoginDto): Promise<{
        staff: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.StaffRole;
            email: string;
        };
        token: string;
        refreshToken: string;
    }>;
    private signTokens;
    refresh(refreshToken: string): Promise<{
        token: string;
    }>;
}
