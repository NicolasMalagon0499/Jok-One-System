import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  bogotaTodayRangeUtc,
  bogotaDateStringRangeUtc,
  bogotaWeekRangeUtc,
  bogotaBiweeklyRangeUtc,
  bogotaMonthRangeUtc,
} from '../utils/bogota-time';

export interface CreateExpenseDto {
  category: 'RENT' | 'WATER' | 'ELECTRICITY' | 'INTERNET' | 'REPAIR' | 'OTHER';
  description?: string;
  amount: number;
}

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async createExpense(data: CreateExpenseDto) {
    return this.prisma.expense.create({ data });
  }

  async getDailyExpenses(date?: string) {
    const { start, end } = date ? bogotaDateStringRangeUtc(date) : bogotaTodayRangeUtc();

    const expenses = await this.prisma.expense.findMany({
      where: { createdAt: { gte: start, lt: end } }
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    return { expenses, total };
  }

  async getWeeklyExpenses() {
    const { start, end } = bogotaWeekRangeUtc();

    const expenses = await this.prisma.expense.findMany({
      where: { createdAt: { gte: start, lt: end } }
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    return { expenses, total };
  }

  async getBiweeklyExpenses() {
    const { start, end } = bogotaBiweeklyRangeUtc();

    const expenses = await this.prisma.expense.findMany({
      where: { createdAt: { gte: start, lt: end } }
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    return { expenses, total };
  }

  async getMonthlyExpensesTotal() {
    const { start, end } = bogotaMonthRangeUtc();

    const expenses = await this.prisma.expense.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: 'desc' }
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory: Record<string, number> = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    return { expenses, total, byCategory };
  }

  async getAllExpenses() {
    return this.prisma.expense.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateExpense(id: string, data: any) {
    return this.prisma.expense.update({
      where: { id },
      data,
    });
  }

  async deleteExpense(id: string) {
    return this.prisma.expense.delete({
      where: { id },
    });
  }
}
