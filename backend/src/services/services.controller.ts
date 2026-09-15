import { Controller, Post, Body, Get, Param, UseGuards, Query, Delete, Patch } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './services.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('services')
@UseGuards(JwtGuard, RolesGuard)
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Post('create')
  @Roles('ADMIN', 'BARBER')
  async createService(@Body() data: CreateServiceDto) {
    return this.servicesService.createService(data);
  }

  @Patch(':id')
  @Roles('ADMIN', 'BARBER')
  async updateService(@Param('id') id: string, @Body() data: any) {
    return this.servicesService.updateService(id, data);
  }

  @Delete(':id')
  @Roles('ADMIN', 'BARBER')
  async deleteService(@Param('id') id: string) {
    return this.servicesService.deleteService(id);
  }

  @Post('guarantee/:barberId')
  @Roles('ADMIN', 'BARBER')
  async claimGuarantee(@Param('barberId') barberId: string) {
    return this.servicesService.claimGuaranteeDay(barberId);
  }

  @Get('guarantee-status/:barberId')
  @Roles('ADMIN', 'BARBER')
  async guaranteeStatus(@Param('barberId') barberId: string) {
    return this.servicesService.getGuaranteeStatus(barberId);
  }

  @Post('cash-base/:barberId')
  @Roles('ADMIN', 'BARBER')
  async setCashBase(@Param('barberId') barberId: string, @Body('amount') amount: number) {
    return this.servicesService.setCashBase(barberId, amount);
  }

  @Post('cash-advance/:barberId')
  @Roles('ADMIN', 'BARBER')
  async createCashAdvance(
    @Param('barberId') barberId: string,
    @Body('amount') amount: number,
    @Body('note') note?: string
  ) {
    return this.servicesService.createCashAdvance(barberId, amount, note);
  }

  @Delete('cash-advance/:id')
  @Roles('ADMIN', 'BARBER')
  async deleteCashAdvance(@Param('id') id: string) {
    return this.servicesService.deleteCashAdvance(id);
  }

  @Get('cash-close/:barberId')
  @Roles('ADMIN', 'BARBER')
  async getCashClose(@Param('barberId') barberId: string, @Query('date') date?: string) {
    return this.servicesService.getCashClose(barberId, date);
  }

  // Rutas específicas PRIMERO
  @Get('daily')
@Roles('ADMIN')
async getAllDailyEarnings(@Query('date') date?: string) {
  return this.servicesService.getAllDailyEarnings(date);
}

  @Get('weekly')
  @Roles('ADMIN')
  async getAllWeeklyEarnings() {
    return this.servicesService.getWeeklyEarnings();
  }

  @Get('biweekly')
  @Roles('ADMIN')
  async getAllBiweeklyEarnings() {
    return this.servicesService.getBiweeklyEarnings();
  }

  @Get('monthly')
  @Roles('ADMIN')
  async getMonthlyEarnings() {
    return this.servicesService.getMonthlyEarnings();
  }

  @Get('history/:barberId')
  @Roles('ADMIN', 'BARBER')
  async getServiceHistory(
    @Param('barberId') barberId: string,
    @Query('date') date?: string
  ) {
    return this.servicesService.getServiceHistory(barberId, date);
  }

  // Ruta dinámica AL FINAL
  @Get(':period/:barberId')
  @Roles('ADMIN', 'BARBER')
  async getEarningsByBarber(
    @Param('period') period: string,
    @Param('barberId') barberId: string,
    @Query('date') date?: string
  ) {
    return this.servicesService.getEarningsByBarber(period, barberId, date);
  }
}