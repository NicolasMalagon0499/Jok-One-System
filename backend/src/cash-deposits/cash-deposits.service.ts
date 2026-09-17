import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { bogotaDateKey, bogotaDateRangeUtc, bogotaDateStringRangeUtc } from '../utils/bogota-time';

@Injectable()
export class CashDepositsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Efectivo esperado día por día en el rango: lo que cobraron en efectivo
   * todos los barberos juntos, menos los vales entregados ese día (esa plata
   * ya salió de caja). No incluye la base entregada a los barberos: es
   * capital de trabajo que se recicla día a día, no ingreso nuevo para
   * consignar.
   */
  async getSummary(startDateStr: string, endDateStr: string) {
    const { start, end } = bogotaDateRangeUtc(startDateStr, endDateStr);

    const [services, advances, deposits] = await Promise.all([
      this.prisma.service.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { cashAmount: true, createdAt: true }
      }),
      this.prisma.cashAdvance.findMany({
        where: { date: { gte: start, lt: end } },
        select: { amount: true, date: true }
      }),
      this.prisma.cashDeposit.findMany({
        where: { date: { gte: start, lt: end } }
      })
    ]);

    const cashByDay: Record<string, number> = {};
    services.forEach(s => {
      const key = bogotaDateKey(new Date(s.createdAt));
      cashByDay[key] = (cashByDay[key] || 0) + (s.cashAmount || 0);
    });

    const advancesByDay: Record<string, number> = {};
    advances.forEach(a => {
      const key = bogotaDateKey(new Date(a.date));
      advancesByDay[key] = (advancesByDay[key] || 0) + a.amount;
    });

    const depositByDay = new Map(deposits.map(d => [bogotaDateKey(new Date(d.date)), d]));

    const days: any[] = [];
    let totalPending = 0;
    let totalDeposited = 0;

    for (let cursor = new Date(start); cursor < end; cursor = new Date(cursor.getTime() + 86400000)) {
      const key = bogotaDateKey(cursor);
      const expectedCash = (cashByDay[key] || 0) - (advancesByDay[key] || 0);
      const deposit = depositByDay.get(key);

      if (deposit) {
        totalDeposited += deposit.depositedAmount;
      } else if (expectedCash !== 0) {
        totalPending += expectedCash;
      }

      days.push({
        date: key,
        expectedCash,
        isDeposited: !!deposit,
        depositedAmount: deposit?.depositedAmount ?? null,
        difference: deposit ? deposit.depositedAmount - expectedCash : null,
        note: deposit?.note ?? null
      });
    }

    // Más recientes primero: es lo que el admin revisa primero (día vencido).
    days.reverse();

    return { days, totalPending, totalDeposited };
  }

  async markDeposited(dateStr: string, depositedAmount: number, note?: string) {
    if (depositedAmount === undefined || depositedAmount === null || Number.isNaN(Number(depositedAmount))) {
      throw new BadRequestException('El monto consignado es obligatorio.');
    }
    const { start } = bogotaDateStringRangeUtc(dateStr);
    return this.prisma.cashDeposit.upsert({
      where: { date: start },
      update: { depositedAmount: Number(depositedAmount), note, depositedAt: new Date() },
      create: { date: start, depositedAmount: Number(depositedAmount), note }
    });
  }

  async unmarkDeposited(dateStr: string) {
    const { start } = bogotaDateStringRangeUtc(dateStr);
    await this.prisma.cashDeposit.deleteMany({ where: { date: start } });
    return { ok: true };
  }
}
