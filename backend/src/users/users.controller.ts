import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('register')
 @UseGuards(JwtGuard, RolesGuard)
 @Roles('ADMIN')
  async register(@Body() data: any) {
    return this.usersService.createUser(data);
  }
 
  @Get('barbers')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  async getBarbers() {
    return this.usersService.getBarbers();
  }
  
}