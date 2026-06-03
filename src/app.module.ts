// src/app.module.ts
import { Module }           from '@nestjs/common';
import { ConfigModule }     from '@nestjs/config';
import { ThrottlerModule }  from '@nestjs/throttler';
import { PrismaModule }     from './common/prisma/prisma.module';
import { AuthModule }       from './auth/auth.module';
import { RoomsModule }      from './rooms/rooms.module';
import { BookingsModule }   from './bookings/bookings.module';
import { PaymentsModule }   from './payments/payments.module';
import { HousekeepingModule } from './housekeeping/housekeeping.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StaffModule }      from './housekeeping/housekeeping.module';
import { ServiceRequestsModule } from './housekeeping/housekeeping.module';
import { GuestsModule } from './guests/guests.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    RoomsModule,
    BookingsModule,
    PaymentsModule,
    HousekeepingModule,
    NotificationsModule,
    StaffModule,
    ServiceRequestsModule,
    GuestsModule,
    EmailModule,
  ],
})
export class AppModule {}
