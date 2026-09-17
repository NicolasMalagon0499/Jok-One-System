import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CashDepositsController } from './cash-deposits.controller';
import { CashDepositsService } from './cash-deposits.service';
import { PrismaModule } from '../prisma/prima.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({ secret: process.env.JWT_SECRET })
  ],
  controllers: [CashDepositsController],
  providers: [CashDepositsService]
})
export class CashDepositsModule {}
