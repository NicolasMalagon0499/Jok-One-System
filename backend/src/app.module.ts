import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ServicesModule } from './services/services.module';
import { PrismaModule } from './prisma/prima.module'
import { ProductsModule } from './products/products.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CashDepositsModule } from './cash-deposits/cash-deposits.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ServicesModule, ProductsModule, ExpensesModule, CashDepositsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}