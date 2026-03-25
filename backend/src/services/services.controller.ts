import { Controller, Post,  Body, Get,Param } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './services.service';

@Controller('services')
export class ServicesController {
    constructor(private servicesService: ServicesService){}
    
    @Post('create')
    async createService(@Body() data: CreateServiceDto){
        return this.servicesService.createService(data);
    }   

    @Get('daily')
    async getAllDailyEarnings() {
        return this.servicesService.getAllDailyEarnings();
    }
    
    @Get('daily/:barberId')
    async getDailyEarnings(@Param('barberId') barberId: string) {
        return this.servicesService.getDailyEarnings(barberId);
    }

    @Get('weekly')
    async getWeeklyEarnings() {
        return this.servicesService.getWeeklyEarnings();
    }

    @Get('weekly/:barberId')
    async getWeeklyEarningsByBarber(@Param('barberId') barberId: string) {
        return this.servicesService.getWeeklyEarnings(barberId);
    }


    @Get('biweekly')
    getBiweekly() {
        return this.servicesService.getBiweeklyEarnings();
    }

    @Get('biweekly/:barberId')
    getBiweeklyByBarber(@Param('barberId') barberId: string) {
        return this.servicesService.getBiweeklyEarnings(barberId);
    }

    @Get('monthly')
    async getMonthlyEarnings() {
        return this.servicesService.getMonthlyEarnings();
    }

    @Get('monthly/:barberId')
    async getMonthlyEarningsByBarber(@Param('barberId') barberId: string) {
        return this.servicesService.getMonthlyEarnings(barberId);
    }
}
