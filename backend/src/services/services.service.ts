import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from '../expenses/expenses.service';
import {
  bogotaDateKey,
  bogotaDateStringRangeUtc,
  bogotaTodayRangeUtc,
  bogotaWeekRangeUtc,
  bogotaBiweeklyRangeUtc,
  bogotaMonthRangeUtc,
} from '../utils/bogota-time';

export interface CreateServiceDto {
  price: number;
  tip: number;
  cashAmount?: number;
  qrAmount?: number;
  specialEvent?: string;
  clientType?: 'NEW' | 'RETURNING';
  barberId: string;
  products?: { productId: string; quantity: number; type?: 'SOLD' | 'USED' }[];
}

const ZERO_DAY_RESULT = {
  totalServices: 0, totalTips: 0,
  totalProductsSold: 0, totalProductsUsed: 0, productCost: 0, productProfit: 0, productShare: 0,
  totalCash: 0, totalQr: 0, barberShare: 0, businessShare: 0,
  rawBarberTotal: 0, barberTotal: 0, compensation: 0, serviceCount: 0, haircutCount: 0,
  totalAdvances: 0, netToPay: 0,
};

@Injectable()
export class ServicesService {

  constructor(private prisma: PrismaService, private expensesService: ExpensesService) {}

  private includeProducts() {
    return { barber: { select: { name: true, hasGuarantee: true } }, products: { include: { product: true } } };
  }

  calculateEarnings(services: any[], isAdmin: boolean = false) {
  let totalServices = 0, totalTips = 0, totalCash = 0, totalQr = 0;
  let totalProductsSold = 0, totalProductsUsed = 0, productCost = 0, productShare = 0;
  const serviceCount = services.length;
  // Un "corte" es un registro con price > 0; una venta de producto sin
  // corte asociado (price === 0) no debe contarse como corte realizado.
  const haircutCount = services.filter(s => Number(s.price || 0) > 0).length;

  services.forEach(s => {
    totalServices += Number(s.price || 0);
    totalTips += Number(s.tip || 0);
    totalCash += Number(s.cashAmount || 0);
    totalQr += Number(s.qrAmount || 0);

    if (s.products) {
      s.products.forEach((sp: any) => {
        if (sp.product) {
          const qty = Number(sp.quantity || 0);
          const saleVal = Number(sp.product.salePrice || 0) * qty;
          if (sp.type === 'SOLD') {
            // Vendido al cliente: cuenta como ingreso por producto y genera comisión.
            totalProductsSold += saleVal;
            productCost += Number(sp.product.costPrice || 0) * qty;
            productShare += saleVal * 0.15;
          } else {
            // Usado en el servicio (no se cobró aparte): solo consumo de inventario, sin comisión.
            totalProductsUsed += saleVal;
          }
        }
      });
    }
  });

  // Margen real del negocio en productos: lo que pagó el cliente, menos lo
  // que costó el producto, menos la comisión que se le da al barbero por venderlo.
  const productProfit = Math.round(totalProductsSold - productCost - productShare);

  const barberShare = Math.round(totalServices * 0.5);
  const businessShare = Math.round((totalServices * 0.5) + productProfit);
  const rawBarberTotal = Math.round(barberShare + totalTips + productShare);
  // La garantía mínima diaria solo aplica a un día en el que el barbero
  // efectivamente registró algo; un día sin ningún servicio no es "un día
  // flojo", es un día sin trabajar y se maneja aparte con GuaranteeDay.
  // Barberos de medio tiempo (hasGuarantee === false) nunca reciben esta
  // garantía, sin importar cuánto hayan ganado ese día.
  const hasGuarantee = services[0]?.barber?.hasGuarantee !== false;
  const compensation = hasGuarantee && serviceCount > 0 && rawBarberTotal < 30000 ? 30000 - rawBarberTotal : 0;
  const barberTotal = rawBarberTotal + compensation; // ← lo que realmente se le paga

  const base = {
    totalServices, totalTips,
    totalProductsSold, totalProductsUsed, productCost, productProfit, productShare,
    totalCash, totalQr,
    rawBarberTotal, barberTotal, compensation, serviceCount, haircutCount
  };
  if (isAdmin) {
    return { ...base, barberShare, businessShare };
  }
  return base;
}

  private buildBusinessSummary(result: any[], totalExpenses: number = 0) {
  const totalBusinessShare = result.reduce((sum, b) => sum + b.businessShare, 0);
  const totalCompensations = result.reduce((sum, b) => sum + b.compensation, 0);
  const totalServiceCount = result.reduce((sum, b) => sum + (b.serviceCount || 0), 0);
  const totalServiceRevenue = result.reduce((sum, b) => sum + b.totalServices, 0);
  const totalProductsSold = result.reduce((sum, b) => sum + b.totalProductsSold, 0);
  const totalProductProfit = result.reduce((sum, b) => sum + b.productProfit, 0);
  // Ingresos totales = todo lo que pagaron los clientes (cortes + productos vendidos), bruto.
  const totalRevenue = totalServiceRevenue + totalProductsSold;
  // Ganancia del negocio ya descontada la garantía pagada a los barberos,
  // pero antes de restar los gastos fijos (arriendo, servicios, etc.).
  const netBeforeExpenses = totalBusinessShare - totalCompensations;
  const netBusiness = netBeforeExpenses - totalExpenses;
  // Cuánto falta (o sobra) para que la ganancia del período cubra los gastos.
  const expensesRemaining = Math.max(0, totalExpenses - netBeforeExpenses);
  return {
    totalRevenue, totalProductsSold, totalProductProfit,
    totalBusinessShare, totalCompensations, totalExpenses, totalServiceCount,
    netBeforeExpenses, netBusiness, expensesRemaining
  };
}

  private groupAndCalculate(services: any[], isAdmin: boolean = true) {
    const grouped: any = {};
    services.forEach(s => {
      if (!grouped[s.barberId]) grouped[s.barberId] = [];
      grouped[s.barberId].push(s);
    });
    return Object.keys(grouped).map(barberId => ({
      barberId,
      barberName: grouped[barberId][0]?.barber?.name || 'Sin nombre',
      ...this.calculateEarnings(grouped[barberId], isAdmin)
    }));
  }

  /**
   * Adds one synthetic day-result per claimed GuaranteeDay in [start, end)
   * that doesn't already have a real (service-backed) entry in dailyResults.
   * Days a barber just didn't work are left alone — no entry, no guarantee.
   */
  private async withGuaranteeDays(dailyResults: any[], start: Date, end: Date, barberId?: string) {
    const claims = await this.prisma.guaranteeDay.findMany({
      where: { ...(barberId && { barberId }), date: { gte: start, lt: end } },
      include: { barber: { select: { name: true } } }
    });
    if (claims.length === 0) return dailyResults;

    const existingKeys = new Set(dailyResults.map(d => `${d.barberId}_${bogotaDateKey(new Date(d.date))}`));
    const guaranteeResults = claims
      .filter(c => !existingKeys.has(`${c.barberId}_${bogotaDateKey(c.date)}`))
      .map(c => ({
        barberId: c.barberId,
        barberName: c.barber?.name || 'Sin nombre',
        date: c.date,
        ...ZERO_DAY_RESULT,
        barberTotal: 30000,
        compensation: 30000,
      }));
    return [...dailyResults, ...guaranteeResults];
  }

  /**
   * Aplica los vales (adelantos en efectivo) de [start, end) a cada día ya
   * presente en dailyResults (bruto = barberTotal sin tocar, neto = barberTotal
   * − vales de ese día), y agrega un día "hueco" si hubo vale sin ningún
   * servicio ni garantía ese día (quedó en contra: netToPay negativo).
   */
  private async withCashAdvances(dailyResults: any[], start: Date, end: Date, barberId?: string) {
    const advances = await this.prisma.cashAdvance.findMany({
      where: { ...(barberId && { barberId }), date: { gte: start, lt: end } },
      include: { barber: { select: { name: true } } }
    });

    const advancesByKey = new Map<string, { barberId: string; barberName: string; date: Date; total: number }>();
    for (const a of advances) {
      const key = `${a.barberId}_${bogotaDateKey(a.date)}`;
      const entry = advancesByKey.get(key);
      if (entry) entry.total += a.amount;
      else advancesByKey.set(key, { barberId: a.barberId, barberName: a.barber?.name || 'Sin nombre', date: a.date, total: a.amount });
    }

    const withAdvances = dailyResults.map(d => {
      const key = `${d.barberId}_${bogotaDateKey(new Date(d.date))}`;
      const entry = advancesByKey.get(key);
      const totalAdvances = entry?.total || 0;
      if (entry) advancesByKey.delete(key); // consumido: lo que quede son vales sin día asociado
      return { ...d, totalAdvances, netToPay: d.barberTotal - totalAdvances };
    });

    const orphanDays = Array.from(advancesByKey.values()).map(e => ({
      barberId: e.barberId,
      barberName: e.barberName,
      date: e.date,
      ...ZERO_DAY_RESULT,
      totalAdvances: e.total,
      netToPay: -e.total,
    }));

    return [...withAdvances, ...orphanDays];
  }

  async createService(data: CreateServiceDto) {
    return this.prisma.$transaction(async (tx) => {
      if (data.products && data.products.length > 0) {
        for (const item of data.products) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (!prod) throw new BadRequestException(`El producto no existe.`);
          if (prod.stock < item.quantity) throw new BadRequestException(`Stock insuficiente para ${prod.name}.`);
        }
      }

      const service = await tx.service.create({
        data: {
          price: Number(data.price || 0),
          tip: Number(data.tip || 0),
          cashAmount: Number(data.cashAmount ?? 0),
          qrAmount: Number(data.qrAmount ?? 0),
          specialEvent: data.specialEvent,
          clientType: data.clientType ?? 'RETURNING',
          barberId: data.barberId,
        }
      });

      if (data.products && data.products.length > 0) {
        for (const item of data.products) {
          const qty = Number(item.quantity);
          await tx.serviceProduct.create({
            data: { serviceId: service.id, productId: item.productId, quantity: qty, type: item.type ?? 'SOLD' }
          });
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: qty } }
          });
        }
      }

      return tx.service.findUnique({
        where: { id: service.id },
        include: { products: { include: { product: true } } }
      });
    });
  }

  async updateService(id: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Recuperar productos actuales y devolver stock
      const currentProducts = await tx.serviceProduct.findMany({ where: { serviceId: id } });
      for (const item of currentProducts) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }

      // 2. Eliminar relaciones actuales
      await tx.serviceProduct.deleteMany({ where: { serviceId: id } });

      // 3. Recrear productos y descontar stock (ya con el stock repuesto en el
      // paso 1, así que esto valida contra la disponibilidad real, incluida
      // la que este mismo servicio tenía reservada antes de editarlo).
      if (data.products && data.products.length > 0) {
        for (const item of data.products) {
          const qty = Number(item.quantity);
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (!prod) throw new BadRequestException(`El producto no existe.`);
          if (prod.stock < qty) throw new BadRequestException(`Stock insuficiente para ${prod.name}.`);
          await tx.serviceProduct.create({
            data: { serviceId: id, productId: item.productId, quantity: qty, type: item.type ?? 'SOLD' }
          });
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: qty } }
          });
        }
      }

      // 4. Actualizar datos base
      return tx.service.update({
        where: { id },
        data: {
          price: Number(data.price || 0),
          tip: Number(data.tip || 0),
          cashAmount: Number(data.cashAmount || 0),
          qrAmount: Number(data.qrAmount || 0),
          specialEvent: data.specialEvent,
          clientType: data.clientType
        }
      });
    });
  }

  async deleteService(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const products = await tx.serviceProduct.findMany({ where: { serviceId: id } });
      for (const item of products) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }
      await tx.serviceProduct.deleteMany({ where: { serviceId: id } });
      return tx.service.delete({ where: { id } });
    });
  }

  /** Barbero marca "hoy trabajé pero no registré nada, aplícame la garantía". */
  async claimGuaranteeDay(barberId: string) {
    const barber = await this.prisma.user.findUnique({ where: { id: barberId }, select: { hasGuarantee: true } });
    if (barber && !barber.hasGuarantee) {
      throw new BadRequestException('Este barbero no tiene garantía mínima diaria.');
    }

    const { start, end } = bogotaTodayRangeUtc();

    const servicesToday = await this.prisma.service.count({
      where: { barberId, createdAt: { gte: start, lt: end } }
    });
    if (servicesToday > 0) {
      throw new BadRequestException('Ya registraste servicios hoy: la garantía se calcula automáticamente si aplica.');
    }

    const existing = await this.prisma.guaranteeDay.findUnique({
      where: { barberId_date: { barberId, date: start } }
    });
    if (existing) {
      throw new BadRequestException('Ya solicitaste la garantía de hoy.');
    }

    return this.prisma.guaranteeDay.create({ data: { barberId, date: start } });
  }

  /** Estado de hoy para decidir si mostrar el botón de garantía en el frontend. */
  async getGuaranteeStatus(barberId: string) {
    const { start, end } = bogotaTodayRangeUtc();
    const [servicesToday, claim] = await Promise.all([
      this.prisma.service.count({ where: { barberId, createdAt: { gte: start, lt: end } } }),
      this.prisma.guaranteeDay.findUnique({ where: { barberId_date: { barberId, date: start } } }),
    ]);
    return { hasServicesToday: servicesToday > 0, claimed: !!claim };
  }

  /** Registra o corrige la base de caja del día (por defecto $50.000). */
  async setCashBase(barberId: string, amount: number) {
    const { start } = bogotaTodayRangeUtc();
    return this.prisma.cashBase.upsert({
      where: { barberId_date: { barberId, date: start } },
      update: { amount: Number(amount) },
      create: { barberId, date: start, amount: Number(amount) }
    });
  }

  /** Registra un vale (adelanto en efectivo) para el día de hoy. */
  async createCashAdvance(barberId: string, amount: number, note?: string) {
    if (!amount || Number(amount) <= 0) {
      throw new BadRequestException('El monto del vale debe ser mayor a 0.');
    }
    const { start } = bogotaTodayRangeUtc();
    return this.prisma.cashAdvance.create({
      data: { barberId, date: start, amount: Number(amount), note }
    });
  }

  async deleteCashAdvance(id: string) {
    return this.prisma.cashAdvance.delete({ where: { id } });
  }

  /** Ganancia bruta de un barbero para un único día puntual (servicios, o la garantía si no hubo ninguno). */
  private async getGrossDayEarnings(barberId: string, start: Date, end: Date, isAdmin: boolean = false) {
    const services = await this.prisma.service.findMany({
      where: { barberId, createdAt: { gte: start, lt: end } },
      include: this.includeProducts()
    });
    if (services.length === 0) {
      const claim = await this.prisma.guaranteeDay.findUnique({
        where: { barberId_date: { barberId, date: start } }
      });
      return claim ? { ...ZERO_DAY_RESULT, barberTotal: 30000, compensation: 30000 } : ZERO_DAY_RESULT;
    }
    return this.calculateEarnings(services, isAdmin);
  }

  /**
   * Cierre de caja de un día puntual (hoy por defecto): cuánto efectivo debe
   * haber (base + efectivo cobrado en servicios − vales) y cuánto le falta
   * pagar realmente al barbero (lo ganado − vales que ya se llevó).
   */
  async getCashClose(barberId: string, date?: string) {
    const { start, end } = date ? bogotaDateStringRangeUtc(date) : bogotaTodayRangeUtc();

    const [base, advances, grossEarned] = await Promise.all([
      this.prisma.cashBase.findUnique({ where: { barberId_date: { barberId, date: start } } }),
      this.prisma.cashAdvance.findMany({ where: { barberId, date: start }, orderBy: { createdAt: 'asc' } }),
      this.getGrossDayEarnings(barberId, start, end)
    ]);

    const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
    const baseAmount = base?.amount ?? 0;

    const expectedCash = baseAmount + grossEarned.totalCash - totalAdvances;
    const netToPay = grossEarned.barberTotal - totalAdvances;

    return {
      hasBase: !!base,
      base: baseAmount,
      totalCash: grossEarned.totalCash,
      totalAdvances,
      advances,
      expectedCash,
      grossEarned: grossEarned.barberTotal,
      netToPay
    };
  }

  async getAllDailyEarnings(date?: string) {
    const { start, end } = date ? bogotaDateStringRangeUtc(date) : bogotaTodayRangeUtc();

    const services = await this.prisma.service.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: this.includeProducts()
    });

    const dailyResults = this.groupAndCalculateByDay(services, true);
    const withGuarantees = await this.withGuaranteeDays(dailyResults, start, end);
    const withAdvances = await this.withCashAdvances(withGuarantees, start, end);
    const result = this.consolidateBarberTotals(withAdvances, true);
    const { total: totalExpenses } = await this.expensesService.getDailyExpenses(date);
    return { barbers: result, businessSummary: this.buildBusinessSummary(result, totalExpenses) };
  }

  async getWeeklyEarnings(barberId?: string) {
    const { start, end } = bogotaWeekRangeUtc();

    const services = await this.prisma.service.findMany({
      where: { ...(barberId && { barberId }), createdAt: { gte: start, lt: end } },
      include: this.includeProducts()
    });

    const dailyResults = this.groupAndCalculateByDay(services, true);
    const withGuarantees = await this.withGuaranteeDays(dailyResults, start, end, barberId);
    const withAdvances = await this.withCashAdvances(withGuarantees, start, end, barberId);
    const result = this.consolidateBarberTotals(withAdvances, true);
    const { total: totalExpenses } = await this.expensesService.getWeeklyExpenses();
    return { barbers: result, businessSummary: this.buildBusinessSummary(result, totalExpenses) };
  }

  async getBiweeklyEarnings(barberId?: string) {
    const { start, end } = bogotaBiweeklyRangeUtc();

    const services = await this.prisma.service.findMany({
      where: { ...(barberId && { barberId }), createdAt: { gte: start, lt: end } },
      include: this.includeProducts()
    });

    const dailyResults = this.groupAndCalculateByDay(services, true);
    const withGuarantees = await this.withGuaranteeDays(dailyResults, start, end, barberId);
    const withAdvances = await this.withCashAdvances(withGuarantees, start, end, barberId);
    const result = this.consolidateBarberTotals(withAdvances, true);
    const { total: totalExpenses } = await this.expensesService.getBiweeklyExpenses();
    return { barbers: result, businessSummary: this.buildBusinessSummary(result, totalExpenses) };
  }

  async getMonthlyEarnings(barberId?: string) {
    const { start, end } = bogotaMonthRangeUtc();

    const services = await this.prisma.service.findMany({
      where: { ...(barberId && { barberId }), createdAt: { gte: start, lt: end } },
      include: this.includeProducts()
    });

    const dailyResults = this.groupAndCalculateByDay(services, true);
    const withGuarantees = await this.withGuaranteeDays(dailyResults, start, end, barberId);
    const withAdvances = await this.withCashAdvances(withGuarantees, start, end, barberId);
    const result = this.consolidateBarberTotals(withAdvances, true);
    const { total: totalExpenses } = await this.expensesService.getMonthlyExpensesTotal();
    return { barbers: result, businessSummary: this.buildBusinessSummary(result, totalExpenses) };
  }

  async getEarningsByBarber(period: string, barberId: string, date?: string) {
    let start: Date, end: Date;

    if (date) {
      ({ start, end } = bogotaDateStringRangeUtc(date));
    } else {
      switch (period) {
        case 'weekly':
          ({ start, end } = bogotaWeekRangeUtc());
          break;
        case 'biweekly':
          ({ start, end } = bogotaBiweeklyRangeUtc());
          break;
        case 'monthly':
          ({ start, end } = bogotaMonthRangeUtc());
          break;
        default:
          ({ start, end } = bogotaTodayRangeUtc());
      }
    }

    // Para un día específico → cálculo directo (sin garantía "de descanso" fantasma)
    // isAdmin=true: aunque el barbero vea su propio detalle por esta misma ruta,
    // esos campos extra (businessShare, etc.) simplemente no los usa su pantalla.
    if (period === 'daily' || date) {
      const gross = await this.getGrossDayEarnings(barberId, start, end, true);
      const advances = await this.prisma.cashAdvance.findMany({ where: { barberId, date: start } });
      const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
      return { ...gross, totalAdvances, netToPay: gross.barberTotal - totalAdvances };
    }

    const services = await this.prisma.service.findMany({
      where: { barberId, createdAt: { gte: start, lt: end } },
      include: this.includeProducts()
    });

    // Para períodos largos (incluida la quincena, que es cuando se paga) → lógica por días
    const dailyResults = this.groupAndCalculateByDay(services, true);
    const withGuarantees = await this.withGuaranteeDays(dailyResults, start, end, barberId);
    const withAdvances = await this.withCashAdvances(withGuarantees, start, end, barberId);
    const consolidated = this.consolidateBarberTotals(withAdvances, true);
    return consolidated.find((b: any) => b.barberId === barberId) || ZERO_DAY_RESULT;
  }

  async getServiceHistory(barberId: string, date?: string) {
    const where: any = { barberId };
    if (date) {
      const { start, end } = bogotaDateStringRangeUtc(date);
      where.createdAt = { gte: start, lt: end };
    }
    return this.prisma.service.findMany({
      where,
      include: { products: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

private groupAndCalculateByDay(services: any[], isAdmin: boolean = true) {
  const grouped: any = {};

  services.forEach(s => {
    // 1. Extraemos el día en horario de Bogotá (ej: "2026-07-28"), no el día UTC
    const dateStr = bogotaDateKey(new Date(s.createdAt));

    // 2. Creamos una llave única por cada barbero y por cada día
    const key = `${s.barberId}_${dateStr}`;

    if (!grouped[key]) {
      grouped[key] = {
        barberId: s.barberId,
        barberName: s.barber?.name || 'Sin nombre',
        services: []
      };
    }
    // 3. Metemos el servicio dentro de su respectivo día
    grouped[key].services.push(s);
  });

  // 4. A cada grupo de un día específico le calculamos sus ganancias (aquí se aplica el mínimo de $30k por día)
  return Object.values(grouped).map((item: any) => ({
    barberId: item.barberId,
    barberName: item.barberName,
    date: item.services[0]?.createdAt, // Opcional para saber qué día es
    ...this.calculateEarnings(item.services, isAdmin)
  }));
}

private consolidateBarberTotals(dailyResults: any[], isAdmin: boolean = true) {
  const barberMap: any = {};

  dailyResults.forEach(day => {
    if (!barberMap[day.barberId]) {
      barberMap[day.barberId] = {
        barberId: day.barberId,
        barberName: day.barberName,
        totalServices: 0,
        totalTips: 0,
        totalProductsSold: 0,
        totalProductsUsed: 0,
        productCost: 0,
        productProfit: 0,
        productShare: 0,
        totalCash: 0,
        totalQr: 0,
        barberShare: 0,
        businessShare: 0,
        rawBarberTotal: 0,
        barberTotal: 0,
        compensation: 0,
        serviceCount: 0,
        haircutCount: 0,
        totalAdvances: 0,
        netToPay: 0
      };
    }

    const b = barberMap[day.barberId];
    b.totalServices += day.totalServices;
    b.totalTips += day.totalTips;
    b.totalProductsSold += day.totalProductsSold;
    b.totalProductsUsed += day.totalProductsUsed;
    b.productCost += day.productCost;
    b.productProfit += day.productProfit;
    b.productShare += day.productShare;
    b.totalCash += day.totalCash;
    b.totalQr += day.totalQr;
    b.barberShare += day.barberShare || 0;   // ausente cuando el día se calculó en modo no-admin
    b.businessShare += day.businessShare || 0;
    b.rawBarberTotal += day.rawBarberTotal;
    b.barberTotal += day.barberTotal;     // ← bruto: ya incluye la garantía de cada día
    b.compensation += day.compensation;  // ← acumula compensaciones de días flojos
    b.serviceCount += day.serviceCount;
    b.haircutCount += day.haircutCount || 0;
    b.totalAdvances += day.totalAdvances || 0;
    b.netToPay += day.netToPay !== undefined ? day.netToPay : day.barberTotal; // ← neto: bruto − vales del período
  });

  return Object.values(barberMap);
}

}
