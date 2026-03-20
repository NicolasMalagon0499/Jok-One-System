import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
//import { PrismaClient } from '@prisma/client';
import { PrismaClient } from '../generated/prisma';
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public prisma: PrismaClient;

  constructor() {
    // Inicializar PrismaClient con opciones explícitas
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log('Prisma conectado exitosamente');
    } catch (error) {
      this.logger.error('Error conectando Prisma:', error);
    }
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  // Exponer métodos específicos para cada modelo
  get user() {
    return this.prisma.user;
  }

  get service() {
    return this.prisma.service;
  }

  // Método genérico para transacciones
  async $transaction<T>(callback: (prisma: PrismaClient) => Promise<T>) {
    return this.prisma.$transaction(callback);
  }
}