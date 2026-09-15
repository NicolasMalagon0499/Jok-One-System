import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { PrismaModule } from '../prisma/prima.module';
import { ExpensesService } from '../expenses/expenses.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({ secret: process.env.JWT_SECRET })
  ],
  controllers: [ServicesController],
  providers: [ServicesService, ExpensesService],
  exports: [ServicesService, ExpensesService]
})
export class ServicesModule {}