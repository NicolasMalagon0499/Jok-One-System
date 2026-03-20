import { Injectable } from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class UsersService {

    constructor(private prisma: PrismaService) {}



    async createUser(data: any){
        return this.prisma.user.create({

        data: {
            name: data.name,
            email: data.email,
            password: data.password,        
            role: data.role,


        }

        })      



    }

}

