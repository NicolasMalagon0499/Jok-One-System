import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ServicesModule } from './services/services.module';
import { PrismaModule } from './prisma/prima.module'
import { ProductsModule } from './products/products.module';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ServicesModule, ProductsModule, ExpensesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}