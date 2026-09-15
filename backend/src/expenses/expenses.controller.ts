import { Controller, Post, Get, Body, UseGuards, Param, Delete, Patch } from '@nestjs/common';
import { ExpensesService, CreateExpenseDto } from './expenses.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';


@Controller('expenses')
@UseGuards(JwtGuard, RolesGuard)
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  @Roles('ADMIN')
  async createExpense(@Body() data: CreateExpenseDto) {
    return this.expensesService.createExpense(data);
  }

  @Get('monthly')
  @Roles('ADMIN')
  async getMonthlyExpenses() {
    return this.expensesService.getMonthlyExpensesTotal();
  }

  @Get()
  @Roles('ADMIN')
  async getAllExpenses() {
    return this.expensesService.getAllExpenses  ();
  }

  // En tu ExpensesController (Backend)
@Patch(':id') // Para editar
@Roles('ADMIN')
async update(@Param('id') id: string, @Body() data: any) {
  return this.expensesService.updateExpense(id, data);
}

@Delete(':id') // Para eliminar
@Roles('ADMIN')
async remove(@Param('id') id: string) {
  return this.expensesService.deleteExpense(id);
}
}