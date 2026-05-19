import {
  Module, Controller, Get, Patch, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtAuthGuard }  from '../auth/auth.guards';
import { RolesGuard }    from '../auth/auth.guards';
import { Roles }         from '../common/decorators/index';
import * as bcrypt       from 'bcrypt';

@Controller('api/v1/guests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER', 'RECEPTIONIST')
export class GuestsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAll() {
    return this.prisma.guest.findMany({
      where:   { deletedAt: null },
      select:  {
        id: true, firstName: true, lastName: true,
        email: true, phone: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data: any = {};
    if (body.firstName) data.firstName = body.firstName;
    if (body.lastName)  data.lastName  = body.lastName;
    if (body.phone)     data.phone     = body.phone;
    if (body.password)  data.passwordHash = await bcrypt.hash(body.password, 12);
    return this.prisma.guest.update({
      where:  { id },
      data,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
  }

  @Delete(':id')
  @Roles('MANAGER')
  async remove(@Param('id') id: string) {
    await this.prisma.guest.update({
      where: { id },
      data:  {
        firstName: 'Deleted',
        lastName:  'User',
        phone:     null,
        deletedAt: new Date(),
      },
    });
    return { message: 'Guest account deleted' };
  }
} 

@Module({
  controllers: [GuestsController],
})
export class GuestsModule {}