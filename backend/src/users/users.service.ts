import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// Cambiamos la ruta relativa por el alias configurado en el tsconfig
//import { User } from 'generated/prisma';
//import { PrismaClient } from '@prisma/client';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {

  constructor(private prisma: PrismaService) {}

  async createUser(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
      }
    });
  }

  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async getBarbers() {
    return this.prisma.user.findMany({
      where: { role: 'BARBER' },
      select: { id: true, name: true, email: true, createdAt: true }
    });
  }

}