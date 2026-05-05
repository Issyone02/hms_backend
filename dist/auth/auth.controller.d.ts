import { AuthService } from './auth.service';
import { RegisterGuestDto, LoginDto } from './dto/auth.dto';
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
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
    refresh(token: string): Promise<{
        token: string;
    }>;
}
