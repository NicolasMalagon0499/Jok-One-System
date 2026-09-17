import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CashDepositsService } from './cash-deposits.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('cash-deposits')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class CashDepositsController {
  constructor(private cashDepositsService: CashDepositsService) {}

  @Get()
  async getSummary(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.cashDepositsService.getSummary(startDate, endDate);
  }

  @Post(':date')
  async markDeposited(
    @Param('date') date: string,
    @Body('depositedAmount') depositedAmount: number,
    @Body('note') note?: string
  ) {
    return this.cashDepositsService.markDeposited(date, depositedAmount, note);
  }

  @Delete(':date')
  async unmarkDeposited(@Param('date') date: string) {
    return this.cashDepositsService.unmarkDeposited(date);
  }
}
