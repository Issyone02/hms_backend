"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../common/prisma/prisma.service");
let AuthService = class AuthService {
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async registerGuest(dto) {
        const exists = await this.prisma.guest.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (exists)
            throw new common_1.ConflictException('Email already registered');
        const hash = await bcrypt.hash(dto.password, 12);
        const guest = await this.prisma.guest.create({
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email.toLowerCase(),
                passwordHash: hash,
                phone: dto.phone,
                gdprConsent: true,
            },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        });
        const tokens = await this.signTokens(guest.id, 'GUEST', guest.email);
        return { ...tokens, guest };
    }
    async loginGuest(dto) {
        const guest = await this.prisma.guest.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (!guest || guest.deletedAt)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const valid = await bcrypt.compare(dto.password, guest.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const tokens = await this.signTokens(guest.id, 'GUEST', guest.email);
        return {
            ...tokens,
            guest: { id: guest.id, firstName: guest.firstName, lastName: guest.lastName, email: guest.email },
        };
    }
    async loginStaff(dto) {
        const staff = await this.prisma.staff.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (!staff || !staff.isActive)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const valid = await bcrypt.compare(dto.password, staff.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const tokens = await this.signTokens(staff.id, staff.role, staff.email);
        return {
            ...tokens,
            staff: { id: staff.id, name: staff.name, role: staff.role, email: staff.email },
        };
    }
    async signTokens(sub, role, email) {
        const payload = { sub, role, email };
        const [token, refreshToken] = await Promise.all([
            this.jwt.signAsync(payload, {
                secret: this.config.get('JWT_SECRET'),
                expiresIn: '15m',
            }),
            this.jwt.signAsync(payload, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
                expiresIn: '7d',
            }),
        ]);
        return { token, refreshToken };
    }
    async refresh(refreshToken) {
        try {
            const payload = await this.jwt.verifyAsync(refreshToken, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
            });
            const token = await this.jwt.signAsync({ sub: payload.sub, role: payload.role, email: payload.email }, { secret: this.config.get('JWT_SECRET'), expiresIn: '15m' });
            return { token };
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map