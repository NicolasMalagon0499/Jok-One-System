import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaModule } from '../prisma/prima.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    })
  ],
  controllers: [ProductsController],
  providers: [ProductsService]
})
export class ProductsModule {}